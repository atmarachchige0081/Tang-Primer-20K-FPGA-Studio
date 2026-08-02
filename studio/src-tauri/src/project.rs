use crate::models::{NodeKind, ProjectNode, WorkspaceSnapshot};
use crate::security::{canonical_workspace, safe_file_path};
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
        root: root.to_string_lossy().into_owned(),
        project,
        project_path: ".".into(),
        tree,
        recent_projects: Vec::new(),
    })
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
