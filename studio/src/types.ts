export type ThemeMode = "dark" | "light" | "system";
export type Activity = "explorer" | "search" | "source" | "hardware" | "ip" | "extensions";
export type BottomPanel = "problems" | "output" | "terminal" | "waveform";
export type WorkbenchView = "editor" | "dashboard" | "netlist" | "waveform" | "hardware" | "uart" | "welcome";
export type BuildAction = "doctor" | "lint" | "sim" | "build" | "upload" | "flash" | "detect";

export interface ProjectNode {
  name: string;
  path: string;
  kind: "file" | "directory";
  children?: ProjectNode[];
}

export interface OpenFile {
  path: string;
  name: string;
  language: string;
  content: string;
  savedContent: string;
}

export interface Diagnostic {
  severity: "error" | "warning" | "info";
  source: string;
  message: string;
  file?: string;
  line?: number;
  column?: number;
}

export interface BuildEvent {
  jobId: string;
  phase: string;
  stream: "stdout" | "stderr" | "system";
  message: string;
  timestamp: string;
}

export interface CommandResult {
  jobId: string;
  action: BuildAction;
  success: boolean;
  exitCode: number | null;
  durationMs: number;
  diagnostics: Diagnostic[];
}

export interface WorkspaceSnapshot {
  root: string;
  project: string;
  projectPath: string;
  tree: ProjectNode[];
  recentProjects: string[];
}

export interface BuildSummary {
  status: "ready" | "passed" | "failed" | "running";
  fmaxMHz: number | null;
  targetMHz: number | null;
  lutUsed: number | null;
  lutTotal: number | null;
  registersUsed: number | null;
  registersTotal: number | null;
  bitstreamBytes: number | null;
  worstSlackNs: number | null;
  updatedAt: string | null;
}

export interface BuildHistoryEntry {
  buildNumber: number;
  action: BuildAction;
  success: boolean;
  durationMs: number;
  completedAt: string;
  fmaxMHz: number | null;
  lutUsed: number | null;
  registersUsed: number | null;
  bitstreamBytes: number | null;
}

export interface SerialDevice {
  portName: string;
  displayName: string;
  vendorId?: number;
  productId?: number;
  likelyBoard: boolean;
}

export interface SerialEvent {
  sessionId: string;
  kind: "data" | "status" | "error";
  data: number[];
  message?: string;
  timestamp: string;
}

export interface WaveSample {
  time: number;
  value: string;
}

export interface WaveSignal {
  id: string;
  name: string;
  scope: string;
  width: number;
  samples: WaveSample[];
}

export interface WaveformData {
  path: string;
  timescale: string;
  endTime: number;
  truncated: boolean;
  signals: WaveSignal[];
}

export interface NetlistNode {
  id: string;
  label: string;
  kind: string;
  detail: string;
  sourceFile?: string;
  sourceLine?: number;
}

export interface NetlistEdge {
  id: string;
  source: string;
  target: string;
  nets: string[];
}

export interface NetlistGraph {
  path: string;
  creator: string;
  moduleName: string;
  totalCells: number;
  truncated: boolean;
  nodes: NetlistNode[];
  edges: NetlistEdge[];
}

export interface ReleaseNote {
  version: string;
  title: string;
  items: string[];
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  level: string;
  category: string;
  base: string;
  overlay?: string;
  hardwareReady: boolean;
  tags: string[];
}

export interface HdlPattern {
  title: string;
  category: string;
  difficulty: string;
  summary: string;
  code: string;
  aliases: string[];
  synthesizable: boolean;
}
