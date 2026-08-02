use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectNode {
    pub name: String,
    pub path: String,
    pub kind: NodeKind,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub children: Option<Vec<ProjectNode>>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum NodeKind {
    File,
    Directory,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceSnapshot {
    pub root: String,
    pub project: String,
    pub project_path: String,
    pub tree: Vec<ProjectNode>,
    pub recent_projects: Vec<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectTemplate {
    pub id: String,
    pub name: String,
    pub description: String,
    pub level: String,
    pub category: String,
    pub base: String,
    #[serde(default)]
    pub overlay: Option<String>,
    pub hardware_ready: bool,
    pub tags: Vec<String>,
    #[serde(default)]
    pub supported_boards: Vec<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TemplateCatalog {
    pub schema_version: u32,
    pub templates: Vec<ProjectTemplate>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HdlPattern {
    pub title: String,
    pub category: String,
    pub difficulty: String,
    pub summary: String,
    pub code: String,
    pub aliases: Vec<String>,
    pub synthesizable: bool,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BoardClock {
    pub name: String,
    pub frequency_hz: u64,
    pub pin: String,
    #[serde(default)]
    pub io_standard: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BoardProgrammer {
    pub backend: String,
    pub board: String,
    pub transport: String,
    #[serde(default)]
    pub jtag_interface: Option<u8>,
    #[serde(default)]
    pub uart_interface: Option<u8>,
    #[serde(default)]
    pub usb_vid: Option<String>,
    #[serde(default)]
    pub usb_pid: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BoardProfile {
    pub schema_version: u32,
    pub id: String,
    pub name: String,
    pub vendor: String,
    pub family: String,
    #[serde(default)]
    pub yosys_family: Option<String>,
    pub device: String,
    #[serde(default)]
    pub logic_cells: Option<u64>,
    pub clocks: Vec<BoardClock>,
    pub programmer: BoardProgrammer,
    pub constraints: Vec<String>,
    #[serde(default)]
    pub documentation: Option<String>,
    #[serde(default)]
    pub capabilities: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitChange {
    pub path: String,
    pub index_status: String,
    pub worktree_status: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitStatus {
    pub available: bool,
    pub repository: bool,
    pub executable: Option<String>,
    pub version: Option<String>,
    pub branch: Option<String>,
    pub upstream: Option<String>,
    pub ahead: u32,
    pub behind: u32,
    pub changes: Vec<GitChange>,
    pub message: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginInfo {
    pub id: String,
    pub name: String,
    pub version: String,
    pub kind: String,
    pub entry: String,
    pub capabilities: Vec<String>,
    pub valid: bool,
    pub message: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PatternCatalog {
    pub schema_version: u32,
    pub patterns: Vec<HdlPattern>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HdlIndex {
    pub top: String,
    pub files: Vec<String>,
    pub symbols: Vec<HdlSymbol>,
    pub diagnostics: Vec<Diagnostic>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HdlSymbol {
    pub name: String,
    pub kind: String,
    pub file: String,
    pub line: u32,
    pub column: u32,
    pub detail: String,
}

#[derive(Debug, Clone, Copy, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum BuildAction {
    Doctor,
    Lint,
    Sim,
    Build,
    Upload,
    Flash,
    Detect,
}

impl BuildAction {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Doctor => "doctor",
            Self::Lint => "lint",
            Self::Sim => "sim",
            Self::Build => "build",
            Self::Upload => "upload",
            Self::Flash => "flash",
            Self::Detect => "detect",
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Diagnostic {
    pub severity: DiagnosticSeverity,
    pub source: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub file: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub line: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub column: Option<u32>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum DiagnosticSeverity {
    Error,
    Warning,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BuildEvent {
    pub job_id: String,
    pub phase: String,
    pub stream: String,
    pub message: String,
    pub timestamp: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandResult {
    pub job_id: String,
    pub action: BuildAction,
    pub success: bool,
    pub exit_code: Option<i32>,
    pub duration_ms: u128,
    pub diagnostics: Vec<Diagnostic>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub failure_message: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BuildSummary {
    pub status: String,
    pub fmax_m_hz: Option<f64>,
    pub target_m_hz: Option<f64>,
    pub lut_used: Option<u64>,
    pub lut_total: Option<u64>,
    pub registers_used: Option<u64>,
    pub registers_total: Option<u64>,
    pub bitstream_bytes: Option<u64>,
    pub worst_slack_ns: Option<f64>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BuildHistoryEntry {
    pub build_number: u64,
    pub action: BuildAction,
    pub success: bool,
    pub duration_ms: u128,
    pub completed_at: String,
    pub fmax_m_hz: Option<f64>,
    pub lut_used: Option<u64>,
    pub registers_used: Option<u64>,
    pub bitstream_bytes: Option<u64>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BuildHistoryFile {
    pub schema_version: u32,
    pub entries: Vec<BuildHistoryEntry>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SerialDevice {
    pub port_name: String,
    pub display_name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub vendor_id: Option<u16>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub product_id: Option<u16>,
    pub likely_board: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SerialEvent {
    pub session_id: String,
    pub kind: String,
    pub data: Vec<u8>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    pub timestamp: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WaveformData {
    pub path: String,
    pub timescale: String,
    pub end_time: u64,
    pub truncated: bool,
    pub signals: Vec<WaveSignal>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WaveSignal {
    pub id: String,
    pub name: String,
    pub scope: String,
    pub width: u32,
    pub samples: Vec<WaveSample>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WaveSample {
    pub time: u64,
    pub value: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NetlistGraph {
    pub path: String,
    pub creator: String,
    pub module_name: String,
    pub total_cells: usize,
    pub truncated: bool,
    pub nodes: Vec<NetlistNode>,
    pub edges: Vec<NetlistEdge>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NetlistNode {
    pub id: String,
    pub label: String,
    pub kind: String,
    pub detail: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source_file: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source_line: Option<u32>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NetlistEdge {
    pub id: String,
    pub source: String,
    pub target: String,
    pub nets: Vec<String>,
}
