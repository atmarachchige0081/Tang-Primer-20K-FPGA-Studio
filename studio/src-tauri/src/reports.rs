use crate::models::BuildSummary;
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

#[cfg(test)]
mod tests {
    use super::utilization_pair;
    use serde_json::json;

    #[test]
    fn reads_utilization_pairs() {
        let report = json!({"LUT4": {"used": 12, "available": 100}});
        assert_eq!(
            utilization_pair(Some(&report), "LUT4"),
            (Some(12), Some(100))
        );
    }
}
