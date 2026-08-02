use crate::models::PluginInfo;
use crate::security::{canonical_workspace, safe_existing_path};
use serde::Deserialize;
use std::collections::HashSet;
use std::fs;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct PluginManifest {
    schema_version: u32,
    id: String,
    name: String,
    version: String,
    kind: String,
    entry: String,
    capabilities: Vec<String>,
}

pub fn list(root: &str) -> Result<Vec<PluginInfo>, String> {
    let workspace = canonical_workspace(root)?;
    let plugin_root = safe_existing_path(&workspace, "plugins")?;
    let mut plugins = Vec::new();
    for entry in
        fs::read_dir(plugin_root).map_err(|error| format!("Cannot inspect plugins: {error}"))?
    {
        let entry = entry.map_err(|error| format!("Cannot read a plugin folder: {error}"))?;
        let manifest_path = entry.path().join("plugin.json");
        if !manifest_path.is_file() {
            continue;
        }
        if plugins.len() >= 100 {
            return Err("More than 100 plugin manifests were found".into());
        }
        let parsed = fs::read(&manifest_path)
            .map_err(|error| format!("Cannot read {}: {error}", manifest_path.display()))
            .and_then(|content| {
                serde_json::from_slice::<PluginManifest>(&content).map_err(|error| {
                    format!(
                        "Invalid plugin JSON in {}: {error}",
                        manifest_path.display()
                    )
                })
            });
        match parsed {
            Ok(manifest) => plugins.push(validate(entry.path(), manifest)),
            Err(message) => plugins.push(PluginInfo {
                id: entry.file_name().to_string_lossy().into_owned(),
                name: "Invalid plugin".into(),
                version: "0.0.0".into(),
                kind: "unknown".into(),
                entry: "".into(),
                capabilities: Vec::new(),
                valid: false,
                message,
            }),
        }
    }
    plugins.sort_by(|left, right| left.name.cmp(&right.name));
    Ok(plugins)
}

fn validate(directory: std::path::PathBuf, manifest: PluginManifest) -> PluginInfo {
    let allowed_kinds = ["board", "ip", "simulator", "analysis", "panel"];
    let allowed_capabilities = [
        "read-project",
        "write-generated",
        "run-allowlisted-tool",
        "read-reports",
        "serial",
    ];
    let mut problems = Vec::new();
    if manifest.schema_version != 1 {
        problems.push("unsupported schema");
    }
    if manifest.id.is_empty()
        || !manifest
            .id
            .chars()
            .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || matches!(c, '.' | '-'))
    {
        problems.push("invalid id");
    }
    if manifest.name.trim().is_empty() {
        problems.push("name is empty");
    }
    if manifest.version.split('.').count() != 3
        || manifest
            .version
            .split('.')
            .any(|part| part.is_empty() || !part.chars().all(|c| c.is_ascii_digit()))
    {
        problems.push("version is not semantic x.y.z");
    }
    if !allowed_kinds.contains(&manifest.kind.as_str()) {
        problems.push("unsupported kind");
    }
    let unique = manifest.capabilities.iter().collect::<HashSet<_>>();
    if unique.len() != manifest.capabilities.len()
        || manifest
            .capabilities
            .iter()
            .any(|value| !allowed_capabilities.contains(&value.as_str()))
    {
        problems.push("invalid capabilities");
    }
    if safe_existing_path(&directory, &manifest.entry).is_err() {
        problems.push("entry is missing or unsafe");
    }
    let valid = problems.is_empty();
    PluginInfo {
        id: manifest.id,
        name: manifest.name,
        version: manifest.version,
        kind: manifest.kind,
        entry: manifest.entry,
        capabilities: manifest.capabilities,
        valid,
        message: if valid {
            "Bundled and ready".into()
        } else {
            problems.join(", ")
        },
    }
}

#[cfg(test)]
mod tests {
    use super::list;

    #[test]
    fn bundled_plugins_are_discovered_and_valid() {
        let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
        let items = list(&root.to_string_lossy()).expect("plugin registry");
        assert!(items
            .iter()
            .any(|item| item.id == "fpga-studio.boards" && item.valid));
        assert!(items
            .iter()
            .any(|item| item.id == "fpga-studio.hdl-patterns" && item.valid));
    }
}
