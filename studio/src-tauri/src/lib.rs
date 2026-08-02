mod boards;
mod git;
mod hardware;
mod hdl;
mod ip;
mod models;
mod netlist;
mod plugins;
mod project;
mod reports;
mod runner;
mod security;
mod waveform;

use hardware::SerialRegistry;
use models::{
    BoardProfile, BuildAction, BuildHistoryEntry, BuildSummary, CommandResult, GitStatus, HdlIndex,
    HdlPattern, NetlistGraph, PluginInfo, ProjectTemplate, SerialDevice, WaveformData,
    WorkspaceSnapshot,
};
use runner::JobRegistry;
use tauri::{AppHandle, State};

async fn blocking<T, F>(label: &'static str, operation: F) -> Result<T, String>
where
    T: Send + 'static,
    F: FnOnce() -> Result<T, String> + Send + 'static,
{
    tauri::async_runtime::spawn_blocking(operation)
        .await
        .map_err(|error| format!("{label} worker stopped unexpectedly: {error}"))?
}

#[tauri::command]
async fn workspace_snapshot() -> Result<WorkspaceSnapshot, String> {
    blocking("Workspace scan", project::snapshot).await
}

#[tauri::command]
async fn read_text_file(root: String, path: String) -> Result<String, String> {
    blocking("File read", move || project::read_text(&root, &path)).await
}

#[tauri::command]
async fn write_text_file(root: String, path: String, content: String) -> Result<(), String> {
    blocking("File save", move || {
        project::write_text(&root, &path, &content)
    })
    .await
}

#[tauri::command]
async fn list_project_templates(root: String) -> Result<Vec<ProjectTemplate>, String> {
    blocking("Template scan", move || project::templates(&root)).await
}

#[tauri::command]
async fn list_hdl_patterns(root: String) -> Result<Vec<HdlPattern>, String> {
    blocking("HDL pattern scan", move || ip::patterns(&root)).await
}

#[tauri::command]
async fn list_boards(root: String) -> Result<Vec<BoardProfile>, String> {
    blocking("Board package scan", move || boards::list(&root)).await
}

#[tauri::command]
async fn active_board(root: String, project: String) -> Result<BoardProfile, String> {
    blocking("Active board scan", move || boards::active(&root, &project)).await
}

#[tauri::command]
async fn read_git_status(root: String) -> Result<GitStatus, String> {
    blocking("Git status", move || git::status(&root)).await
}

#[tauri::command]
async fn list_plugins(root: String) -> Result<Vec<PluginInfo>, String> {
    blocking("Plugin scan", move || plugins::list(&root)).await
}

#[tauri::command]
async fn read_hdl_index(root: String, project: String) -> Result<HdlIndex, String> {
    blocking("HDL index", move || hdl::index(&root, &project)).await
}

#[tauri::command]
async fn create_project(
    root: String,
    name: String,
    template_id: String,
    display_name: String,
    board_id: String,
) -> Result<WorkspaceSnapshot, String> {
    blocking("Project creation", move || {
        project::create_project(&root, &name, &template_id, &display_name, &board_id)
    })
    .await
}

#[tauri::command]
async fn run_fpga_command(
    app: AppHandle,
    jobs: State<'_, JobRegistry>,
    root: String,
    project: String,
    action: BuildAction,
    job_id: String,
) -> Result<CommandResult, String> {
    runner::run(app, jobs.inner().clone(), root, project, action, job_id).await
}

#[tauri::command]
fn cancel_job(jobs: State<'_, JobRegistry>, job_id: String) -> Result<bool, String> {
    jobs.cancel(&job_id)
}

#[tauri::command]
async fn read_build_summary(root: String, project: String) -> Result<BuildSummary, String> {
    blocking("Build summary", move || {
        reports::build_summary(&root, &project)
    })
    .await
}

#[tauri::command]
async fn read_build_history(
    root: String,
    project: String,
) -> Result<Vec<BuildHistoryEntry>, String> {
    blocking("Build history", move || {
        reports::build_history(&root, &project)
    })
    .await
}

#[tauri::command]
async fn list_serial_devices() -> Result<Vec<SerialDevice>, String> {
    blocking("Serial device scan", hardware::serial_devices).await
}

#[tauri::command]
async fn launch_zadig(root: String, project: String) -> Result<String, String> {
    blocking("Driver helper", move || {
        hardware::launch_zadig(&root, &project)
    })
    .await
}

#[tauri::command]
async fn connect_serial(
    app: AppHandle,
    sessions: State<'_, SerialRegistry>,
    port_name: String,
    baud_rate: u32,
    session_id: String,
) -> Result<(), String> {
    let registry = sessions.inner().clone();
    blocking("Serial connection", move || {
        hardware::connect(app, registry, port_name, baud_rate, session_id)
    })
    .await
}

#[tauri::command]
async fn write_serial(
    sessions: State<'_, SerialRegistry>,
    session_id: String,
    data: Vec<u8>,
) -> Result<(), String> {
    let registry = sessions.inner().clone();
    blocking("Serial write", move || {
        hardware::write(&registry, &session_id, data)
    })
    .await
}

#[tauri::command]
async fn disconnect_serial(
    sessions: State<'_, SerialRegistry>,
    session_id: String,
) -> Result<bool, String> {
    let registry = sessions.inner().clone();
    blocking("Serial disconnect", move || {
        hardware::disconnect(&registry, &session_id)
    })
    .await
}

#[tauri::command]
async fn read_waveform(root: String, project: String) -> Result<WaveformData, String> {
    blocking("Waveform parser", move || waveform::read(&root, &project)).await
}

#[tauri::command]
async fn read_netlist(root: String, project: String) -> Result<NetlistGraph, String> {
    blocking("Netlist parser", move || netlist::read(&root, &project)).await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() -> Result<(), String> {
    tauri::Builder::default()
        .manage(JobRegistry::default())
        .manage(SerialRegistry::default())
        .invoke_handler(tauri::generate_handler![
            workspace_snapshot,
            read_text_file,
            write_text_file,
            list_project_templates,
            list_hdl_patterns,
            list_boards,
            active_board,
            read_git_status,
            list_plugins,
            read_hdl_index,
            create_project,
            run_fpga_command,
            cancel_job,
            read_build_summary,
            read_build_history,
            list_serial_devices,
            launch_zadig,
            connect_serial,
            write_serial,
            disconnect_serial,
            read_waveform,
            read_netlist,
        ])
        .run(tauri::generate_context!())
        .map_err(|error| format!("FPGA Studio could not start: {error}"))
}

pub fn smoke_test() -> Result<(), String> {
    let snapshot = project::snapshot()?;
    let boards = boards::list(&snapshot.root)?;
    if boards.len() < 7 {
        return Err(format!(
            "Expected at least seven board profiles, found {}",
            boards.len()
        ));
    }
    let _active = boards::active(&snapshot.root, &snapshot.project_path)?;
    let patterns = ip::patterns(&snapshot.root)?;
    if patterns.len() < 50 {
        return Err(format!(
            "Expected at least 50 HDL patterns, found {}",
            patterns.len()
        ));
    }
    let providers = plugins::list(&snapshot.root)?;
    if providers.iter().any(|provider| !provider.valid) {
        return Err("At least one bundled plugin provider is invalid".into());
    }
    let _git = git::status(&snapshot.root)?;
    let _hdl = hdl::index(&snapshot.root, &snapshot.project_path)?;
    Ok(())
}
