use crate::models::{Diagnostic, DiagnosticSeverity, HdlIndex, HdlSymbol};
use crate::security::{canonical_workspace, safe_existing_path};
use regex::Regex;
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

const MAX_HDL_FILES: usize = 500;
const MAX_HDL_BYTES: u64 = 2 * 1024 * 1024;

pub fn index(root: &str, project: &str) -> Result<HdlIndex, String> {
    let root = canonical_workspace(root)?;
    let project = safe_existing_path(&root, project)?;
    let mut source_paths = Vec::new();
    collect_sources(&project.join("rtl"), &mut source_paths)?;
    source_paths.sort();
    if source_paths.len() > MAX_HDL_FILES {
        return Err(format!(
            "This project contains {} HDL files; the live intelligence limit is {MAX_HDL_FILES}",
            source_paths.len()
        ));
    }
    let top = configured_top(&project);
    let mut files = Vec::new();
    let mut symbols = Vec::new();
    let mut diagnostics = Vec::new();
    let mut modules = HashMap::<String, HdlSymbol>::new();
    for path in source_paths {
        let relative = path
            .strip_prefix(&root)
            .map_err(|_| "HDL source escaped the workspace")?
            .to_string_lossy()
            .replace('\\', "/");
        files.push(relative.clone());
        let metadata = fs::metadata(&path)
            .map_err(|error| format!("Cannot inspect {}: {error}", path.display()))?;
        if metadata.len() > MAX_HDL_BYTES {
            diagnostics.push(Diagnostic {
                severity: DiagnosticSeverity::Warning,
                source: "hdl-intelligence".into(),
                message: "File exceeds the 2 MiB live-intelligence limit".into(),
                file: Some(relative),
                line: Some(1),
                column: Some(1),
            });
            continue;
        }
        let content = fs::read_to_string(&path)
            .map_err(|error| format!("Cannot read {}: {error}", path.display()))?;
        for symbol in parse_symbols(&content, &relative) {
            if symbol.kind == "module" {
                if let Some(previous) = modules.get(&symbol.name) {
                    diagnostics.push(Diagnostic {
                        severity: DiagnosticSeverity::Error,
                        source: "hdl-intelligence".into(),
                        message: format!(
                            "Module '{}' is declared more than once (first at {}:{})",
                            symbol.name, previous.file, previous.line
                        ),
                        file: Some(symbol.file.clone()),
                        line: Some(symbol.line),
                        column: Some(symbol.column),
                    });
                } else {
                    modules.insert(symbol.name.clone(), symbol.clone());
                }
            }
            symbols.push(symbol);
        }
    }
    if files.is_empty() {
        diagnostics.push(Diagnostic {
            severity: DiagnosticSeverity::Error,
            source: "hdl-intelligence".into(),
            message: "No Verilog or SystemVerilog files were found under rtl/".into(),
            file: None,
            line: None,
            column: None,
        });
    } else if !modules.contains_key(&top) {
        diagnostics.push(Diagnostic {
            severity: DiagnosticSeverity::Error,
            source: "hdl-intelligence".into(),
            message: format!("Configured top module '{top}' was not found"),
            file: Some(
                project
                    .join("fpga.config.psd1")
                    .strip_prefix(&root)
                    .unwrap_or(Path::new("fpga.config.psd1"))
                    .to_string_lossy()
                    .replace('\\', "/"),
            ),
            line: Some(1),
            column: Some(1),
        });
    }
    symbols.sort_by(|left, right| {
        left.name
            .to_ascii_lowercase()
            .cmp(&right.name.to_ascii_lowercase())
            .then_with(|| left.file.cmp(&right.file))
            .then_with(|| left.line.cmp(&right.line))
    });
    Ok(HdlIndex {
        top,
        files,
        symbols,
        diagnostics,
    })
}

fn collect_sources(directory: &Path, result: &mut Vec<PathBuf>) -> Result<(), String> {
    if !directory.is_dir() {
        return Ok(());
    }
    for entry in fs::read_dir(directory)
        .map_err(|error| format!("Cannot list {}: {error}", directory.display()))?
    {
        let entry = entry.map_err(|error| format!("Cannot read HDL directory entry: {error}"))?;
        let file_type = entry
            .file_type()
            .map_err(|error| format!("Cannot inspect HDL entry: {error}"))?;
        if file_type.is_symlink() {
            continue;
        }
        if file_type.is_dir() {
            collect_sources(&entry.path(), result)?;
        } else if file_type.is_file()
            && matches!(
                entry.path().extension().and_then(|value| value.to_str()),
                Some("v" | "sv" | "vh" | "svh")
            )
        {
            result.push(entry.path());
        }
    }
    Ok(())
}

fn configured_top(project: &Path) -> String {
    let content = fs::read_to_string(project.join("fpga.config.psd1")).unwrap_or_default();
    Regex::new(r#"(?m)^\s*Top\s*=\s*['\"]([A-Za-z_]\w*)['\"]"#)
        .expect("top regex")
        .captures(&content)
        .and_then(|captures| captures.get(1))
        .map_or_else(|| "top".into(), |value| value.as_str().to_owned())
}

fn parse_symbols(content: &str, file: &str) -> Vec<HdlSymbol> {
    let mut symbols = Vec::new();
    let module = Regex::new(r"(?m)^\s*module\s+([A-Za-z_]\w*)").expect("module regex");
    for captures in module.captures_iter(content) {
        if let Some(value) = captures.get(1) {
            let (line, column) = position(content, value.start());
            symbols.push(HdlSymbol {
                name: value.as_str().to_owned(),
                kind: "module".into(),
                file: file.to_owned(),
                line,
                column,
                detail: "SystemVerilog module".into(),
            });
        }
    }
    let declaration = Regex::new(
        r"(?m)^\s*(input|output|inout|logic|wire|reg|parameter|localparam)\b([^;\n]*)(?:;|,|\))",
    )
    .expect("declaration regex");
    let identifier = Regex::new(r"[A-Za-z_]\w*").expect("identifier regex");
    let ignored = ["logic", "wire", "reg", "signed", "unsigned"];
    for captures in declaration.captures_iter(content) {
        let kind = captures.get(1).map_or("signal", |value| value.as_str());
        let Some(body) = captures.get(2) else {
            continue;
        };
        for value in identifier.find_iter(body.as_str()) {
            if ignored.contains(&value.as_str()) {
                continue;
            }
            let offset = body.start() + value.start();
            let (line, column) = position(content, offset);
            symbols.push(HdlSymbol {
                name: value.as_str().to_owned(),
                kind: kind.to_owned(),
                file: file.to_owned(),
                line,
                column,
                detail: format!("{kind} declaration"),
            });
        }
    }
    let instance =
        Regex::new(r"(?m)^\s*([A-Za-z_]\w*)\s*(?:#\s*\([^;]*?\)\s*)?([A-Za-z_]\w*)\s*\(")
            .expect("instance regex");
    for captures in instance.captures_iter(content) {
        let type_name = captures.get(1).map_or("", |value| value.as_str());
        if ["module", "if", "for", "case", "function", "task"].contains(&type_name) {
            continue;
        }
        if let Some(value) = captures.get(2) {
            let (line, column) = position(content, value.start());
            symbols.push(HdlSymbol {
                name: value.as_str().to_owned(),
                kind: "instance".into(),
                file: file.to_owned(),
                line,
                column,
                detail: format!("Instance of {type_name}"),
            });
        }
    }
    symbols
}

fn position(content: &str, offset: usize) -> (u32, u32) {
    let prefix = &content[..offset];
    let line = prefix.bytes().filter(|value| *value == b'\n').count() as u32 + 1;
    let column = prefix
        .rsplit_once('\n')
        .map_or(prefix.len(), |(_, tail)| tail.len()) as u32
        + 1;
    (line, column)
}

#[cfg(test)]
mod tests {
    use super::index;
    use std::fs;

    #[test]
    fn indexes_modules_signals_instances_and_duplicate_diagnostics() {
        let root = std::env::temp_dir().join(format!("fpga-studio-hdl-{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(root.join("rtl")).expect("rtl");
        fs::write(root.join("fpga.ps1"), "# marker").expect("marker");
        fs::write(root.join("fpga.config.psd1"), "@{ Top = 'top' }").expect("config");
        fs::write(root.join("rtl/top.sv"), "module top(input logic clk, output logic led);\nlogic state;\nchild u_child(.clk(clk));\nendmodule\n").expect("top");
        fs::write(
            root.join("rtl/duplicate.sv"),
            "module top; endmodule\nmodule child(input logic clk); endmodule\n",
        )
        .expect("duplicate");
        let result = index(&root.to_string_lossy(), ".").expect("index");
        assert!(result
            .symbols
            .iter()
            .any(|symbol| symbol.name == "u_child" && symbol.kind == "instance"));
        assert!(result.symbols.iter().any(|symbol| symbol.name == "state"));
        assert_eq!(result.diagnostics.len(), 1);
        fs::remove_dir_all(root).expect("cleanup");
    }
}
