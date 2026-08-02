use crate::models::{NodeKind, ProjectNode, ProjectTemplate, TemplateCatalog, WorkspaceSnapshot};
use crate::security::{
    canonical_workspace, child_process_path, safe_existing_path, safe_file_path,
};
use chrono::Utc;
use regex::Regex;
use std::fs;
use std::path::{Path, PathBuf};

const IGNORED_DIRECTORIES: &[&str] = &[
    ".git",
    ".fpga-studio",
    "node_modules",
    "target",
    "__pycache__",
];
const MAX_TREE_ENTRIES: usize = 20_000;

pub fn discover_workspace() -> Result<PathBuf, String> {
    if let Ok(override_root) = std::env::var("FPGA_STUDIO_WORKSPACE") {
        return canonical_workspace(&override_root);
    }
    let start = std::env::current_dir()
        .map_err(|error| format!("Cannot read the working directory: {error}"))?;
    for candidate in start.ancestors() {
        if candidate.join("fpga.ps1").is_file() {
            return canonical_workspace(&candidate.to_string_lossy());
        }
    }
    let development_root = Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
    if development_root.join("fpga.ps1").is_file() {
        return canonical_workspace(&development_root.to_string_lossy());
    }
    Err("No FPGA Studio workspace was found. Set FPGA_STUDIO_WORKSPACE or open the app from a repository checkout.".into())
}

pub fn snapshot() -> Result<WorkspaceSnapshot, String> {
    let root = discover_workspace()?;
    let mut seen = 0;
    let tree = list_directory(&root, &root, &mut seen)?;
    let project = root
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("FPGA project")
        .to_owned();
    Ok(WorkspaceSnapshot {
        root: child_process_path(&root).to_string_lossy().into_owned(),
        project,
        project_path: ".".into(),
        tree,
        recent_projects: Vec::new(),
    })
}

pub fn templates(root: &str) -> Result<Vec<ProjectTemplate>, String> {
    let root = canonical_workspace(root)?;
    let catalog_path = root.join("templates/catalog.json");
    let catalog: TemplateCatalog = serde_json::from_slice(
        &fs::read(&catalog_path)
            .map_err(|error| format!("Cannot read template catalog: {error}"))?,
    )
    .map_err(|error| format!("Template catalog is invalid: {error}"))?;
    if catalog.schema_version != 1 {
        return Err(format!(
            "Unsupported template catalog schema {}",
            catalog.schema_version
        ));
    }
    for template in &catalog.templates {
        validate_template_source(&root, &template.base)?;
        if let Some(overlay) = &template.overlay {
            validate_template_source(&root, overlay)?;
        }
    }
    Ok(catalog.templates)
}

pub fn create_project(
    root: &str,
    name: &str,
    template_id: &str,
    display_name: &str,
) -> Result<WorkspaceSnapshot, String> {
    let root = canonical_workspace(root)?;
    let project_name = name.trim();
    let name_pattern = Regex::new(r"^\d{2}_[a-z][a-z0-9_]*$").expect("project name regex is valid");
    if !name_pattern.is_match(project_name) {
        return Err(
            "Use two digits, an underscore, and lowercase words, for example 04_spi_sensor".into(),
        );
    }
    let template = templates(&root.to_string_lossy())?
        .into_iter()
        .find(|item| item.id == template_id)
        .ok_or_else(|| format!("Unknown project template '{template_id}'"))?;
    let projects_root = root.join("projects");
    fs::create_dir_all(&projects_root)
        .map_err(|error| format!("Cannot create projects directory: {error}"))?;
    let target = projects_root.join(project_name);
    if target.exists() {
        return Err(format!("A project named '{project_name}' already exists"));
    }
    let base = validate_template_source(&root, &template.base)?;
    let result = (|| {
        fs::create_dir(&target)
            .map_err(|error| format!("Cannot create project folder: {error}"))?;
        copy_template_tree(&base, &target)?;
        if let Some(overlay) = &template.overlay {
            let overlay = validate_template_source(&root, overlay)?;
            copy_template_tree(&overlay, &target)?;
        }
        let title = if display_name.trim().is_empty() {
            template.name.as_str()
        } else {
            display_name.trim()
        };
        let manifest = serde_json::json!({
            "schemaVersion": 1,
            "name": title,
            "folder": project_name,
            "board": "tang_primer_20k",
            "top": "top",
            "template": template.id,
            "createdAt": Utc::now().to_rfc3339(),
            "languages": ["systemverilog"],
            "sourceRoots": ["rtl"],
            "testRoots": ["sim"]
        });
        fs::write(
            target.join("fpga.project.json"),
            serde_json::to_string_pretty(&manifest)
                .map_err(|error| format!("Cannot serialize project manifest: {error}"))?
                + "\n",
        )
        .map_err(|error| format!("Cannot write project manifest: {error}"))?;
        let readme = target.join("README.md");
        if readme.is_file() && !display_name.trim().is_empty() {
            let existing = fs::read_to_string(&readme)
                .map_err(|error| format!("Cannot read template README: {error}"))?;
            let heading = Regex::new(r"(?m)^# .+$").expect("heading regex is valid");
            fs::write(
                &readme,
                heading
                    .replacen(&existing, 1, format!("# {}", display_name.trim()))
                    .as_bytes(),
            )
            .map_err(|error| format!("Cannot customize project README: {error}"))?;
        }
        Ok::<(), String>(())
    })();
    if let Err(error) = result {
        let _ = fs::remove_dir_all(&target);
        return Err(format!("Project creation was rolled back: {error}"));
    }
    let mut seen = 0;
    Ok(WorkspaceSnapshot {
        root: child_process_path(&root).to_string_lossy().into_owned(),
        project: if display_name.trim().is_empty() {
            project_name.to_owned()
        } else {
            display_name.trim().to_owned()
        },
        project_path: format!("projects/{project_name}"),
        tree: list_directory(&root, &target, &mut seen)?,
        recent_projects: vec![format!("projects/{project_name}")],
    })
}

fn validate_template_source(root: &Path, relative: &str) -> Result<PathBuf, String> {
    let source = safe_existing_path(root, relative)?;
    let projects = root.join("projects");
    let templates = root.join("templates");
    if !source.is_dir() || (!source.starts_with(&projects) && !source.starts_with(&templates)) {
        return Err(format!(
            "Template source is outside the allowed packages: {relative}"
        ));
    }
    Ok(source)
}

fn copy_template_tree(source: &Path, target: &Path) -> Result<(), String> {
    for entry in fs::read_dir(source)
        .map_err(|error| format!("Cannot list template {}: {error}", source.display()))?
    {
        let entry = entry.map_err(|error| format!("Cannot read template entry: {error}"))?;
        let file_type = entry
            .file_type()
            .map_err(|error| format!("Cannot inspect template entry: {error}"))?;
        let name = entry.file_name();
        let name_text = name.to_string_lossy();
        if file_type.is_symlink() {
            return Err(format!(
                "Template symlinks are not allowed: {}",
                entry.path().display()
            ));
        }
        if file_type.is_dir()
            && ["build", "obj_dir", "__pycache__", ".fpga-studio"].contains(&name_text.as_ref())
        {
            continue;
        }
        let destination = target.join(&name);
        if file_type.is_dir() {
            fs::create_dir_all(&destination)
                .map_err(|error| format!("Cannot create template directory: {error}"))?;
            copy_template_tree(&entry.path(), &destination)?;
        } else if file_type.is_file()
            && !matches!(
                entry.path().extension().and_then(|value| value.to_str()),
                Some("pyc" | "vvp" | "vcd" | "fst" | "fs")
            )
        {
            fs::copy(entry.path(), destination)
                .map_err(|error| format!("Cannot copy template file: {error}"))?;
        }
    }
    Ok(())
}

fn list_directory(
    root: &Path,
    directory: &Path,
    seen: &mut usize,
) -> Result<Vec<ProjectNode>, String> {
    let mut entries = fs::read_dir(directory)
        .map_err(|error| format!("Cannot list {}: {error}", directory.display()))?
        .filter_map(Result::ok)
        .filter(|entry| {
            let name = entry.file_name();
            let name = name.to_string_lossy();
            !(entry.path().is_dir() && IGNORED_DIRECTORIES.contains(&name.as_ref()))
                && name != "studio"
        })
        .collect::<Vec<_>>();
    entries.sort_by_key(|entry| {
        (
            !entry.path().is_dir(),
            entry.file_name().to_string_lossy().to_lowercase(),
        )
    });
    let mut nodes = Vec::new();
    for entry in entries {
        if *seen >= MAX_TREE_ENTRIES {
            break;
        }
        *seen += 1;
        let path = entry.path();
        let relative = path
            .strip_prefix(root)
            .map_err(|_| "Project tree escaped the workspace")?
            .to_string_lossy()
            .replace('\\', "/");
        let name = entry.file_name().to_string_lossy().into_owned();
        if path.is_dir() {
            let children = list_directory(root, &path, seen)?;
            nodes.push(ProjectNode {
                name,
                path: relative,
                kind: NodeKind::Directory,
                children: Some(children),
            });
        } else {
            nodes.push(ProjectNode {
                name,
                path: relative,
                kind: NodeKind::File,
                children: None,
            });
        }
    }
    Ok(nodes)
}

pub fn read_text(root: &str, relative: &str) -> Result<String, String> {
    let root = canonical_workspace(root)?;
    let file = safe_file_path(&root, relative)?;
    let metadata = fs::metadata(&file).map_err(|error| format!("Cannot inspect file: {error}"))?;
    if metadata.len() > 4 * 1024 * 1024 {
        return Err("Text files larger than 4 MiB are opened read-only by external tools".into());
    }
    fs::read_to_string(&file).map_err(|error| format!("Cannot read {}: {error}", file.display()))
}

pub fn write_text(root: &str, relative: &str, content: &str) -> Result<(), String> {
    if content.len() > 4 * 1024 * 1024 {
        return Err("Refusing to save a text buffer larger than 4 MiB".into());
    }
    let root = canonical_workspace(root)?;
    let file = safe_file_path(&root, relative)?;
    let suffix = file
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or("txt");
    let temporary = file.with_extension(format!("{suffix}.{}.tmp", uuid::Uuid::new_v4()));
    fs::write(&temporary, content).map_err(|error| format!("Cannot stage file: {error}"))?;
    if !file.exists() {
        return fs::rename(&temporary, &file)
            .map_err(|error| format!("Cannot commit saved file: {error}"));
    }
    let backup = file.with_extension(format!("{suffix}.fpga-studio-backup"));
    if backup.exists() {
        fs::remove_file(&backup)
            .map_err(|error| format!("Cannot remove stale save backup: {error}"))?;
    }
    fs::rename(&file, &backup).map_err(|error| format!("Cannot stage existing file: {error}"))?;
    if let Err(error) = fs::rename(&temporary, &file) {
        let _ = fs::rename(&backup, &file);
        let _ = fs::remove_file(&temporary);
        return Err(format!(
            "Cannot commit saved file; the original was restored: {error}"
        ));
    }
    fs::remove_file(&backup).map_err(|error| {
        format!("File saved, but its temporary backup could not be removed: {error}")
    })
}

#[cfg(test)]
mod tests {
    use super::create_project;
    use std::fs;

    #[test]
    fn creates_transactional_project_from_catalog() {
        let root =
            std::env::temp_dir().join(format!("fpga-studio-project-test-{}", uuid::Uuid::new_v4()));
        let base = root.join("projects/_template");
        let overlay = root.join("templates/demo");
        fs::create_dir_all(base.join("rtl")).expect("base tree");
        fs::create_dir_all(base.join("build")).expect("generated tree");
        fs::create_dir_all(overlay.join("rtl")).expect("overlay tree");
        fs::write(root.join("fpga.ps1"), "# test").expect("workspace marker");
        fs::write(base.join("rtl/top.sv"), "module old; endmodule\n").expect("base source");
        fs::write(base.join("build/generated.bin"), "ignore").expect("generated file");
        fs::write(base.join("README.md"), "# Template\n").expect("readme");
        fs::write(overlay.join("rtl/top.sv"), "module top; endmodule\n").expect("overlay source");
        fs::write(
            root.join("templates/catalog.json"),
            r#"{
          "schemaVersion": 1,
          "templates": [{
            "id": "demo", "name": "Demo", "description": "Test", "level": "Beginner",
            "category": "Test", "base": "projects/_template", "overlay": "templates/demo",
            "hardwareReady": true, "tags": ["test"]
          }]
        }"#,
        )
        .expect("catalog");

        let result = create_project(&root.to_string_lossy(), "04_demo", "demo", "Demo project")
            .expect("project creation should pass");
        assert_eq!(result.project_path, "projects/04_demo");
        assert!(root.join("projects/04_demo/fpga.project.json").is_file());
        assert_eq!(
            fs::read_to_string(root.join("projects/04_demo/rtl/top.sv")).expect("created source"),
            "module top; endmodule\n"
        );
        assert!(!root.join("projects/04_demo/build").exists());
        assert!(create_project(&root.to_string_lossy(), "../escape", "demo", "").is_err());
        assert!(create_project(&root.to_string_lossy(), "04_demo", "demo", "").is_err());

        fs::remove_dir_all(&root).expect("temporary workspace cleanup");
    }
}
