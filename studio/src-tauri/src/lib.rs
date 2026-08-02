mod hardware;
mod ip;
mod models;
mod netlist;
mod project;
mod reports;
mod runner;
mod security;
mod waveform;

use hardware::SerialRegistry;
use models::{
    BuildAction, BuildHistoryEntry, BuildSummary, CommandResult, HdlPattern, NetlistGraph,
    ProjectTemplate, SerialDevice, WaveformData, WorkspaceSnapshot,
};
use runner::JobRegistry;
use tauri::{AppHandle, State};

#[tauri::command]
fn workspace_snapshot() -> Result<WorkspaceSnapshot, String> {
    project::snapshot()
}

#[tauri::command]
fn read_text_file(root: String, path: String) -> Result<String, String> {
    project::read_text(&root, &path)
}

#[tauri::command]
fn write_text_file(root: String, path: String, content: String) -> Result<(), String> {
    project::write_text(&root, &path, &content)
}

#[tauri::command]
fn list_project_templates(root: String) -> Result<Vec<ProjectTemplate>, String> {
    project::templates(&root)
}

#[tauri::command]
fn list_hdl_patterns(root: String) -> Result<Vec<HdlPattern>, String> {
    ip::patterns(&root)
}

#[tauri::command]
fn create_project(
    root: String,
    name: String,
    template_id: String,
    display_name: String,
) -> Result<WorkspaceSnapshot, String> {
    project::create_project(&root, &name, &template_id, &display_name)
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
fn read_build_summary(root: String, project: String) -> Result<BuildSummary, String> {
    reports::build_summary(&root, &project)
}

#[tauri::command]
fn read_build_history(root: String, project: String) -> Result<Vec<BuildHistoryEntry>, String> {
    reports::build_history(&root, &project)
}

#[tauri::command]
fn list_serial_devices() -> Result<Vec<SerialDevice>, String> {
    hardware::serial_devices()
}

#[tauri::command]
fn connect_serial(
    app: AppHandle,
    sessions: State<'_, SerialRegistry>,
    port_name: String,
    baud_rate: u32,
    session_id: String,
) -> Result<(), String> {
    hardware::connect(
        app,
        sessions.inner().clone(),
        port_name,
        baud_rate,
        session_id,
    )
}

#[tauri::command]
fn write_serial(
    sessions: State<'_, SerialRegistry>,
    session_id: String,
    data: Vec<u8>,
) -> Result<(), String> {
    hardware::write(sessions.inner(), &session_id, data)
}

#[tauri::command]
fn disconnect_serial(
    sessions: State<'_, SerialRegistry>,
    session_id: String,
) -> Result<bool, String> {
    hardware::disconnect(sessions.inner(), &session_id)
}

#[tauri::command]
fn read_waveform(root: String, project: String) -> Result<WaveformData, String> {
    waveform::read(&root, &project)
}

#[tauri::command]
fn read_netlist(root: String, project: String) -> Result<NetlistGraph, String> {
    netlist::read(&root, &project)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(JobRegistry::default())
        .manage(SerialRegistry::default())
        .invoke_handler(tauri::generate_handler![
            workspace_snapshot,
            read_text_file,
            write_text_file,
            list_project_templates,
            list_hdl_patterns,
            create_project,
            run_fpga_command,
            cancel_job,
            read_build_summary,
            read_build_history,
            list_serial_devices,
            connect_serial,
            write_serial,
            disconnect_serial,
            read_waveform,
            read_netlist,
        ])
        .run(tauri::generate_context!())
        .expect("FPGA Studio could not start");
}
