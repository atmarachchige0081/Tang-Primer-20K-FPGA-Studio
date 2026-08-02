use crate::models::{BuildAction, BuildHistoryEntry, BuildHistoryFile, BuildSummary};
use crate::security::{canonical_workspace, safe_existing_path};
use chrono::{DateTime, Utc};
use serde_json::Value;
use std::fs;

pub fn build_summary(root: &str, project: &str) -> Result<BuildSummary, String> {
    let root = canonical_workspace(root)?;
    let project = safe_existing_path(&root, project)?;
    let report_path = project.join("build/timing.json");
    let bitstream_path = project.join("build/top.fs");
    if !report_path.is_file() {
        return Ok(BuildSummary {
            status: "ready".into(),
            fmax_m_hz: None,
            target_m_hz: None,
            lut_used: None,
            lut_total: None,
            registers_used: None,
            registers_total: None,
            bitstream_bytes: file_size(&bitstream_path),
            worst_slack_ns: None,
            updated_at: None,
        });
    }
    let data: Value = serde_json::from_slice(
        &fs::read(&report_path).map_err(|error| format!("Cannot read timing report: {error}"))?,
    )
    .map_err(|error| format!("Timing report is invalid JSON: {error}"))?;
    let first_clock = data
        .get("fmax")
        .and_then(Value::as_object)
        .and_then(|clocks| clocks.values().next());
    let fmax = first_clock
        .and_then(|clock| clock.get("achieved"))
        .and_then(Value::as_f64);
    let target = first_clock
        .and_then(|clock| clock.get("constraint"))
        .and_then(Value::as_f64);
    let utilization = data.get("utilization");
    let (lut_used, lut_total) = utilization_pair(utilization, "LUT4");
    let (registers_used, registers_total) = utilization_pair(utilization, "DFF");
    let worst_path_ns = data
        .get("critical_paths")
        .and_then(Value::as_array)
        .and_then(|paths| {
            paths
                .iter()
                .filter_map(|path| {
                    path.get("path").and_then(Value::as_array).map(|segments| {
                        segments
                            .iter()
                            .filter_map(|segment| segment.get("delay").and_then(Value::as_f64))
                            .sum::<f64>()
                    })
                })
                .max_by(f64::total_cmp)
        });
    let worst_slack = target
        .filter(|value| *value > 0.0)
        .and_then(|value| worst_path_ns.map(|path| 1000.0 / value - path));
    let updated_at = fs::metadata(&report_path)
        .ok()
        .and_then(|metadata| metadata.modified().ok())
        .map(|time| DateTime::<Utc>::from(time).to_rfc3339());
    Ok(BuildSummary {
        status: "passed".into(),
        fmax_m_hz: fmax,
        target_m_hz: target,
        lut_used,
        lut_total,
        registers_used,
        registers_total,
        bitstream_bytes: file_size(&bitstream_path),
        worst_slack_ns: worst_slack,
        updated_at,
    })
}

fn utilization_pair(root: Option<&Value>, name: &str) -> (Option<u64>, Option<u64>) {
    let item = root.and_then(|value| value.get(name));
    (
        item.and_then(|value| value.get("used"))
            .and_then(Value::as_u64),
        item.and_then(|value| value.get("available"))
            .and_then(Value::as_u64),
    )
}

fn file_size(path: &std::path::Path) -> Option<u64> {
    fs::metadata(path).ok().map(|metadata| metadata.len())
}

pub fn build_history(root: &str, project: &str) -> Result<Vec<BuildHistoryEntry>, String> {
    let root = canonical_workspace(root)?;
    let project = safe_existing_path(&root, project)?;
    read_history_file(&project)
}

pub fn record_history(
    root: &str,
    project: &str,
    action: BuildAction,
    success: bool,
    duration_ms: u128,
) -> Result<(), String> {
    let summary = build_summary(root, project)?;
    let root = canonical_workspace(root)?;
    let project = safe_existing_path(&root, project)?;
    let mut entries = read_history_file(&project)?;
    let build_number = entries.last().map_or(1, |entry| entry.build_number + 1);
    entries.push(BuildHistoryEntry {
        build_number,
        action,
        success,
        duration_ms,
        completed_at: Utc::now().to_rfc3339(),
        fmax_m_hz: summary.fmax_m_hz,
        lut_used: summary.lut_used,
        registers_used: summary.registers_used,
        bitstream_bytes: summary.bitstream_bytes,
    });
    if entries.len() > 200 {
        entries.drain(..entries.len() - 200);
    }
    let directory = project.join(".fpga-studio");
    fs::create_dir_all(&directory)
        .map_err(|error| format!("Cannot create build history directory: {error}"))?;
    let path = directory.join("build-history.json");
    let temporary = directory.join("build-history.json.tmp");
    let backup = directory.join("build-history.json.bak");
    let data = serde_json::to_vec_pretty(&BuildHistoryFile {
        schema_version: 1,
        entries,
    })
    .map_err(|error| format!("Cannot serialize build history: {error}"))?;
    fs::write(&temporary, data).map_err(|error| format!("Cannot write build history: {error}"))?;
    if path.is_file() {
        let _ = fs::remove_file(&backup);
        fs::rename(&path, &backup)
            .map_err(|error| format!("Cannot prepare build history update: {error}"))?;
    }
    if let Err(error) = fs::rename(&temporary, &path) {
        if backup.is_file() {
            let _ = fs::rename(&backup, &path);
        }
        return Err(format!("Cannot publish build history: {error}"));
    }
    if backup.is_file() {
        let _ = fs::remove_file(backup);
    }
    Ok(())
}

fn read_history_file(project: &std::path::Path) -> Result<Vec<BuildHistoryEntry>, String> {
    let path = project.join(".fpga-studio/build-history.json");
    if !path.is_file() {
        return Ok(Vec::new());
    }
    let history: BuildHistoryFile = serde_json::from_slice(
        &fs::read(&path).map_err(|error| format!("Cannot read build history: {error}"))?,
    )
    .map_err(|error| format!("Build history is invalid JSON: {error}"))?;
    if history.schema_version != 1 {
        return Err(format!(
            "Unsupported build history schema {}",
            history.schema_version
        ));
    }
    Ok(history.entries)
}

#[cfg(test)]
mod tests {
    use super::{read_history_file, utilization_pair};
    use serde_json::json;

    #[test]
    fn reads_utilization_pairs() {
        let report = json!({"LUT4": {"used": 12, "available": 100}});
        assert_eq!(
            utilization_pair(Some(&report), "LUT4"),
            (Some(12), Some(100))
        );
    }

    #[test]
    fn missing_history_is_empty() {
        let directory =
            std::env::temp_dir().join(format!("fpga-studio-history-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&directory).expect("temporary directory");
        assert!(read_history_file(&directory).expect("history").is_empty());
        std::fs::remove_dir_all(directory).expect("remove temporary directory");
    }
}
