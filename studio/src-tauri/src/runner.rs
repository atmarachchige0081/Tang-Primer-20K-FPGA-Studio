use crate::models::{BuildAction, BuildEvent, CommandResult, Diagnostic, DiagnosticSeverity};
use crate::reports;
use crate::security::{canonical_workspace, safe_existing_path};
use chrono::Utc;
use regex::Regex;
use std::collections::HashMap;
use std::io::{BufRead, BufReader};
use std::process::{Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{mpsc, Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};

#[derive(Default, Clone)]
pub struct JobRegistry {
    jobs: Arc<Mutex<HashMap<String, Arc<AtomicBool>>>>,
}

impl JobRegistry {
    fn insert(&self, id: String, flag: Arc<AtomicBool>) -> Result<(), String> {
        self.jobs
            .lock()
            .map_err(|_| "Job registry is unavailable")?
            .insert(id, flag);
        Ok(())
    }

    fn remove(&self, id: &str) {
        if let Ok(mut jobs) = self.jobs.lock() {
            jobs.remove(id);
        }
    }

    pub fn cancel(&self, id: &str) -> Result<bool, String> {
        let jobs = self
            .jobs
            .lock()
            .map_err(|_| "Job registry is unavailable")?;
        if let Some(flag) = jobs.get(id) {
            flag.store(true, Ordering::SeqCst);
            Ok(true)
        } else {
            Ok(false)
        }
    }
}

pub async fn run(
    app: AppHandle,
    registry: JobRegistry,
    root: String,
    project: String,
    action: BuildAction,
    requested_job_id: String,
) -> Result<CommandResult, String> {
    let job_id = if requested_job_id.len() <= 80
        && requested_job_id
            .chars()
            .all(|character| character.is_ascii_alphanumeric() || matches!(character, '-' | '_'))
    {
        requested_job_id
    } else {
        uuid::Uuid::new_v4().to_string()
    };
    tauri::async_runtime::spawn_blocking(move || {
        run_blocking(app, registry, root, project, action, job_id)
    })
    .await
    .map_err(|error| format!("FPGA job worker stopped unexpectedly: {error}"))?
}

fn run_blocking(
    app: AppHandle,
    registry: JobRegistry,
    root: String,
    project: String,
    action: BuildAction,
    job_id: String,
) -> Result<CommandResult, String> {
    let workspace = canonical_workspace(&root)?;
    let project_dir = safe_existing_path(&workspace, &project)?;
    if !project_dir.is_dir() || !project_dir.join("fpga.config.psd1").is_file() {
        return Err("The active project has no fpga.config.psd1".into());
    }
    let cancellation = Arc::new(AtomicBool::new(false));
    registry.insert(job_id.clone(), cancellation.clone())?;
    let started = Instant::now();
    emit(
        &app,
        &job_id,
        action.as_str(),
        "system",
        "Starting FPGA toolchain job",
    );

    let mut command = Command::new("powershell.exe");
    command
        .arg("-NoLogo")
        .arg("-NoProfile")
        .arg("-NonInteractive")
        .arg("-ExecutionPolicy")
        .arg("Bypass")
        .arg("-File")
        .arg(workspace.join("fpga.ps1"))
        .arg(action.as_str())
        .arg("-Project")
        .arg(&project)
        .current_dir(&workspace)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x0800_0000);
    }
    let mut child = match command.spawn() {
        Ok(child) => child,
        Err(error) => {
            registry.remove(&job_id);
            return Err(format!("Cannot start PowerShell: {error}"));
        }
    };
    let process_id = child.id();
    let stdout = child
        .stdout
        .take()
        .ok_or("FPGA job stdout is unavailable")?;
    let stderr = child
        .stderr
        .take()
        .ok_or("FPGA job stderr is unavailable")?;
    let (sender, receiver) = mpsc::channel::<(&'static str, String)>();
    for (stream, pipe) in [
        ("stdout", Box::new(stdout) as Box<dyn std::io::Read + Send>),
        ("stderr", Box::new(stderr) as Box<dyn std::io::Read + Send>),
    ] {
        let sender = sender.clone();
        std::thread::spawn(move || {
            for line in BufReader::new(pipe).lines().map_while(Result::ok) {
                if sender.send((stream, line)).is_err() {
                    break;
                }
            }
        });
    }
    drop(sender);

    let mut captured = Vec::new();
    let exit_status = loop {
        match receiver.recv_timeout(Duration::from_millis(35)) {
            Ok((stream, line)) => {
                emit(&app, &job_id, action.as_str(), stream, &line);
                captured.push(line);
            }
            Err(mpsc::RecvTimeoutError::Disconnected) => {
                break child
                    .wait()
                    .map_err(|error| format!("Cannot wait for FPGA job: {error}"))?;
            }
            Err(mpsc::RecvTimeoutError::Timeout) => {}
        }
        if cancellation.load(Ordering::SeqCst) {
            terminate_process_tree(process_id, &mut child);
            emit(
                &app,
                &job_id,
                action.as_str(),
                "system",
                "Cancellation requested",
            );
        }
        if let Some(status) = child
            .try_wait()
            .map_err(|error| format!("Cannot inspect FPGA job: {error}"))?
        {
            while let Ok((stream, line)) = receiver.try_recv() {
                emit(&app, &job_id, action.as_str(), stream, &line);
                captured.push(line);
            }
            break status;
        }
    };
    registry.remove(&job_id);
    let diagnostics = parse_diagnostics(&captured);
    let success = exit_status.success() && !cancellation.load(Ordering::SeqCst);
    let duration_ms = started.elapsed().as_millis();
    if let Err(error) = reports::record_history(
        &workspace.to_string_lossy(),
        &project,
        action,
        success,
        duration_ms,
    ) {
        emit(
            &app,
            &job_id,
            action.as_str(),
            "system",
            &format!("Build history was not saved: {error}"),
        );
    }
    Ok(CommandResult {
        job_id,
        action,
        success,
        exit_code: exit_status.code(),
        duration_ms,
        diagnostics,
    })
}

fn emit(app: &AppHandle, job_id: &str, phase: &str, stream: &str, message: &str) {
    let _ = app.emit(
        "fpga-build-event",
        BuildEvent {
            job_id: job_id.to_owned(),
            phase: phase.to_owned(),
            stream: stream.to_owned(),
            message: message.to_owned(),
            timestamp: Utc::now().to_rfc3339(),
        },
    );
}

fn terminate_process_tree(process_id: u32, child: &mut std::process::Child) {
    #[cfg(windows)]
    {
        let _ = Command::new("taskkill")
            .args(["/PID", &process_id.to_string(), "/T", "/F"])
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status();
    }
    let _ = child.kill();
}

fn parse_diagnostics(lines: &[String]) -> Vec<Diagnostic> {
    let location = Regex::new(r"(?i)^(?P<file>[^:]+\.(?:v|sv|vh|svh)):(?P<line>\d+)(?::(?P<column>\d+))?[: ]+(?P<message>.+)$").expect("diagnostic regex is valid");
    lines
        .iter()
        .filter_map(|line| {
            let lower = line.to_ascii_lowercase();
            let severity = if lower.contains("error") || lower.contains("%fatal") {
                DiagnosticSeverity::Error
            } else if lower.contains("warning") || lower.contains("%warn") {
                DiagnosticSeverity::Warning
            } else {
                return None;
            };
            let captures = location.captures(line);
            Some(Diagnostic {
                severity,
                source: "toolchain".into(),
                message: captures
                    .as_ref()
                    .and_then(|value| value.name("message"))
                    .map_or_else(
                        || line.trim().to_owned(),
                        |value| value.as_str().trim().to_owned(),
                    ),
                file: captures
                    .as_ref()
                    .and_then(|value| value.name("file"))
                    .map(|value| value.as_str().replace('\\', "/")),
                line: captures
                    .as_ref()
                    .and_then(|value| value.name("line"))
                    .and_then(|value| value.as_str().parse().ok()),
                column: captures
                    .as_ref()
                    .and_then(|value| value.name("column"))
                    .and_then(|value| value.as_str().parse().ok()),
            })
        })
        .take(500)
        .collect()
}

#[cfg(test)]
mod tests {
    use super::parse_diagnostics;
    use crate::models::DiagnosticSeverity;

    #[test]
    fn extracts_hdl_diagnostics() {
        let values = parse_diagnostics(&["rtl/top.sv:18:7: warning: unused signal".into()]);
        assert_eq!(values.len(), 1);
        assert!(matches!(values[0].severity, DiagnosticSeverity::Warning));
        assert_eq!(values[0].line, Some(18));
    }
}
