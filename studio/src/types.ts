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

export interface SerialDevice {
  portName: string;
  displayName: string;
  vendorId?: number;
  productId?: number;
  likelyBoard: boolean;
}

export interface ReleaseNote {
  version: string;
  title: string;
  items: string[];
}
