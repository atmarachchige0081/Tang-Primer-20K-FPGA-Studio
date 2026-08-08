export type ThemeMode = "dark" | "light" | "system";
export type Activity = "explorer" | "search" | "source" | "hardware" | "ip" | "extensions";
export type BottomPanel = "problems" | "output" | "terminal" | "waveform";
export type WorkbenchView = "editor" | "dashboard" | "analysis" | "verification" | "netlist" | "waveform" | "hardware" | "uart" | "welcome";
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
  code?: string;
  suggestion?: string;
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
  failureMessage?: string;
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
  timingMet: boolean | null;
  resources: ResourceUsage[];
  clocks: ClockTiming[];
  criticalPaths: CriticalPath[];
}

export interface ResourceUsage {
  name: string;
  label: string;
  used: number;
  total: number;
}

export interface ClockTiming {
  name: string;
  achievedMHz: number;
  constraintMHz: number;
  slackNs: number;
  timingMet: boolean;
}

export interface CriticalPath {
  source: string;
  destination: string;
  delayNs: number;
  slackNs?: number;
  segments: number;
}

export type VerificationStageStatus = "pass" | "fail" | "warning" | "notRun";

export interface VerificationStage {
  id: string;
  label: string;
  status: VerificationStageStatus;
  detail: string;
  durationMs?: number;
  completedAt?: string;
  artifacts: string[];
}

export interface VerificationSummary {
  generatedAt: string;
  projectUpdatedAt?: string;
  stages: VerificationStage[];
  passed: number;
  warnings: number;
  failed: number;
  notRun: number;
  nextAction: string;
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
  supportedBoards?: string[];
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

export interface BoardClock {
  name: string;
  frequencyHz: number;
  pin: string;
  ioStandard?: string;
}

export interface BoardProfile {
  schemaVersion: number;
  id: string;
  name: string;
  vendor: string;
  family: string;
  yosysFamily?: string;
  device: string;
  logicCells?: number;
  clocks: BoardClock[];
  programmer: {
    backend: string;
    board: string;
    transport: string;
    jtagInterface?: number;
    uartInterface?: number;
    usbVid?: string;
    usbPid?: string;
  };
  constraints: string[];
  documentation?: string;
  capabilities: string[];
}

export interface GitChange {
  path: string;
  indexStatus: string;
  worktreeStatus: string;
}

export interface GitStatus {
  available: boolean;
  repository: boolean;
  executable?: string;
  version?: string;
  branch?: string;
  upstream?: string;
  ahead: number;
  behind: number;
  changes: GitChange[];
  message: string;
}

export interface PluginInfo {
  id: string;
  name: string;
  version: string;
  kind: string;
  entry: string;
  capabilities: string[];
  valid: boolean;
  message: string;
}

export interface HdlSymbol {
  name: string;
  kind: string;
  file: string;
  line: number;
  column: number;
  detail: string;
}

export interface HdlIndex {
  top: string;
  files: string[];
  symbols: HdlSymbol[];
  diagnostics: Diagnostic[];
  modules: HdlModule[];
  instances: HdlInstance[];
  clockDomains: ClockDomain[];
}

export interface HdlModule {
  name: string;
  file: string;
  line: number;
  ports: string[];
}

export interface HdlInstance {
  parentModule: string;
  moduleName: string;
  instanceName: string;
  file: string;
  line: number;
}

export interface ClockDomain {
  moduleName: string;
  clock: string;
  edge: string;
  reset?: string;
  file: string;
  line: number;
}
