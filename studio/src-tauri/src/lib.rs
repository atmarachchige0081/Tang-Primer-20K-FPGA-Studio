mod hardware;
mod models;
mod project;
mod reports;
mod runner;
mod security;

use models::{BuildAction, BuildSummary, CommandResult, SerialDevice, WorkspaceSnapshot};
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
fn list_serial_devices() -> Result<Vec<SerialDevice>, String> {
    hardware::serial_devices()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(JobRegistry::default())
        .invoke_handler(tauri::generate_handler![
            workspace_snapshot,
            read_text_file,
            write_text_file,
            run_fpga_command,
            cancel_job,
            read_build_summary,
            list_serial_devices,
        ])
        .run(tauri::generate_context!())
        .expect("FPGA Studio could not start");
}
