import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type {
  BuildAction,
  BuildEvent,
  BuildHistoryEntry,
  BuildSummary,
  CommandResult,
  HdlIndex,
  HdlPattern,
  NetlistGraph,
  ProjectNode,
  ProjectTemplate,
  SerialDevice,
  SerialEvent,
  WaveformData,
  WorkspaceSnapshot,
} from "../types";

const isDesktop = (): boolean => typeof window !== "undefined" && Boolean(window.__TAURI_INTERNALS__);

const demoSource = `module top (
  input  logic clk,
  input  logic reset_n,
  output logic led
);
  logic [23:0] counter;

  always_ff @(posedge clk or negedge reset_n) begin
    if (!reset_n) begin
      counter <= '0;
      led <= 1'b0;
    end else if (&counter) begin
      counter <= '0;
      led <= ~led;
    end else begin
      counter <= counter + 1'b1;
    end
  end
endmodule
`;

const demoTree: ProjectNode[] = [
  { name: "rtl", path: "rtl", kind: "directory", children: [{ name: "top.sv", path: "rtl/top.sv", kind: "file" }] },
  { name: "sim", path: "sim", kind: "directory", children: [{ name: "tb_top.sv", path: "sim/tb_top.sv", kind: "file" }] },
  { name: "constraints", path: "constraints", kind: "directory", children: [{ name: "tang_primer_20k.cst", path: "constraints/tang_primer_20k.cst", kind: "file" }] },
  { name: "fpga.config.psd1", path: "fpga.config.psd1", kind: "file" },
];

const demoTemplates: ProjectTemplate[] = [
  { id: "led_button", name: "LED and button starter", description: "Board I/O, counter, simulation, and waveform.", level: "Beginner", category: "Fundamentals", base: "projects/_template", hardwareReady: true, tags: ["led", "button"] },
  { id: "uart_terminal", name: "UART terminal", description: "Verified greeting and echo at 115200 baud.", level: "Beginner +", category: "Interfaces", base: "projects/03_uart_terminal", hardwareReady: true, tags: ["uart", "serial"] },
  { id: "spi_controller", name: "SPI controller", description: "Mode-0 byte transfers and loopback verification.", level: "Intermediate", category: "Interfaces", base: "projects/_template", hardwareReady: true, tags: ["spi", "fsm"] },
  { id: "pwm_controller", name: "Button-controlled PWM", description: "Debouncing and multi-channel LED PWM.", level: "Beginner +", category: "Control", base: "projects/01_button_led_pwm", hardwareReady: true, tags: ["pwm", "cdc"] },
  { id: "vga_timing", name: "VGA timing laboratory", description: "Raster coordinates and sync timing.", level: "Intermediate", category: "Video", base: "projects/_template", hardwareReady: true, tags: ["vga", "timing"] },
  { id: "riscv_scaffold", name: "RISC-V core scaffold", description: "RV32I decoder and program-counter shell.", level: "Advanced starter", category: "Processors", base: "projects/_template", hardwareReady: true, tags: ["risc-v", "rv32i"] },
];

export const bridge = {
  isDesktop,

  async workspaceSnapshot(): Promise<WorkspaceSnapshot> {
    if (isDesktop()) return invoke<WorkspaceSnapshot>("workspace_snapshot");
    return { root: "Browser preview", project: "Tang Primer 20K Demo", projectPath: ".", tree: demoTree, recentProjects: [] };
  },

  async readText(root: string, path: string): Promise<string> {
    if (isDesktop()) return invoke<string>("read_text_file", { root, path });
    if (path === "rtl/top.sv") return demoSource;
    return `// Browser preview for ${path}\n`;
  },

  async writeText(root: string, path: string, content: string): Promise<void> {
    if (isDesktop()) await invoke("write_text_file", { root, path, content });
  },

  async projectTemplates(root: string): Promise<ProjectTemplate[]> {
    return isDesktop() ? invoke<ProjectTemplate[]>("list_project_templates", { root }) : demoTemplates;
  },

  async hdlPatterns(root: string): Promise<HdlPattern[]> {
    if (isDesktop()) return invoke<HdlPattern[]>("list_hdl_patterns", { root });
    return [
      { title: "Clocked register with synchronous reset", category: "Sequential logic", difficulty: "Beginner", summary: "Stores a value on the rising edge and clears it synchronously.", code: "always_ff @(posedge clk) begin\n    if (reset) value <= '0;\n    else value <= next_value;\nend", aliases: ["ffreg"], synthesizable: true },
      { title: "Two-flop input synchronizer", category: "Clock domain crossing", difficulty: "Beginner", summary: "Reduces metastability risk for a single asynchronous input.", code: "always_ff @(posedge clk) begin\n    sync_ff1 <= async_in;\n    sync_ff2 <= sync_ff1;\nend", aliases: ["sync2"], synthesizable: true },
      { title: "Self-checking assertion", category: "Verification", difficulty: "Beginner", summary: "Stops a simulation when an expected condition is false.", code: "assert (actual === expected) else $fatal(1, \"Mismatch\");", aliases: ["check"], synthesizable: false },
    ];
  },

  async hdlIndex(root: string, project: string): Promise<HdlIndex> {
    if (isDesktop()) return invoke<HdlIndex>("read_hdl_index", { root, project });
    return { top: "top", files: ["rtl/top.sv"], symbols: [
      { name: "top", kind: "module", file: "rtl/top.sv", line: 1, column: 8, detail: "SystemVerilog module" },
      { name: "clk", kind: "input", file: "rtl/top.sv", line: 2, column: 16, detail: "input declaration" },
      { name: "led", kind: "output", file: "rtl/top.sv", line: 4, column: 16, detail: "output declaration" },
      { name: "counter", kind: "logic", file: "rtl/top.sv", line: 6, column: 16, detail: "logic declaration" },
    ], diagnostics: [] };
  },

  async createProject(root: string, name: string, templateId: string, displayName: string): Promise<WorkspaceSnapshot> {
    if (isDesktop()) return invoke<WorkspaceSnapshot>("create_project", { root, name, templateId, displayName });
    return { root, project: displayName || name, projectPath: `projects/${name}`, tree: demoTree, recentProjects: [`projects/${name}`] };
  },

  async run(root: string, project: string, action: BuildAction, jobId: string): Promise<CommandResult> {
    if (isDesktop()) return invoke<CommandResult>("run_fpga_command", { root, project, action, jobId });
    await new Promise((resolve) => window.setTimeout(resolve, 500));
    return { jobId, action, success: true, exitCode: 0, durationMs: 500, diagnostics: [], failureMessage: undefined };
  },

  async cancel(jobId: string): Promise<boolean> {
    return isDesktop() ? invoke<boolean>("cancel_job", { jobId }) : false;
  },

  async buildSummary(root: string, project: string): Promise<BuildSummary> {
    if (isDesktop()) return invoke<BuildSummary>("read_build_summary", { root, project });
    return { status: "ready", fmaxMHz: 72.4, targetMHz: 27, lutUsed: 1842, lutTotal: 20736, registersUsed: 1106, registersTotal: 15552, bitstreamBytes: 142336, worstSlackNs: 8.12, updatedAt: new Date().toISOString() };
  },

  async buildHistory(root: string, project: string): Promise<BuildHistoryEntry[]> {
    if (isDesktop()) return invoke<BuildHistoryEntry[]>("read_build_history", { root, project });
    return [
      { buildNumber: 1, action: "lint", success: true, durationMs: 740, completedAt: new Date(Date.now() - 180_000).toISOString(), fmaxMHz: null, lutUsed: null, registersUsed: null, bitstreamBytes: null },
      { buildNumber: 2, action: "sim", success: true, durationMs: 1220, completedAt: new Date(Date.now() - 120_000).toISOString(), fmaxMHz: null, lutUsed: null, registersUsed: null, bitstreamBytes: null },
      { buildNumber: 3, action: "build", success: true, durationMs: 8200, completedAt: new Date().toISOString(), fmaxMHz: 72.4, lutUsed: 1842, registersUsed: 1106, bitstreamBytes: 142336 },
    ];
  },

  async serialDevices(): Promise<SerialDevice[]> {
    if (isDesktop()) return invoke<SerialDevice[]>("list_serial_devices");
    return [{ portName: "COM5", displayName: "Tang Primer Debugger UART (preview)", likelyBoard: true }];
  },

  async launchZadig(root: string, project: string): Promise<string> {
    if (isDesktop()) return invoke<string>("launch_zadig", { root, project });
    return "Browser preview: verified Zadig would open for JTAG Interface 0.";
  },

  async connectSerial(portName: string, baudRate: number, sessionId: string): Promise<void> {
    if (isDesktop()) await invoke("connect_serial", { portName, baudRate, sessionId });
  },

  async writeSerial(sessionId: string, data: number[]): Promise<void> {
    if (isDesktop()) await invoke("write_serial", { sessionId, data });
  },

  async disconnectSerial(sessionId: string): Promise<boolean> {
    return isDesktop() ? invoke<boolean>("disconnect_serial", { sessionId }) : true;
  },

  async onSerialEvent(handler: (event: SerialEvent) => void): Promise<UnlistenFn> {
    if (isDesktop()) return listen<SerialEvent>("fpga-serial-event", ({ payload }) => handler(payload));
    return () => undefined;
  },

  async readWaveform(root: string, project: string): Promise<WaveformData> {
    if (isDesktop()) return invoke<WaveformData>("read_waveform", { root, project });
    return {
      path: "projects/demo/build/waves.vcd",
      timescale: "1 ns",
      endTime: 100,
      truncated: false,
      signals: [
        { id: "!", name: "clk", scope: "tb_top", width: 1, samples: Array.from({ length: 21 }, (_, index) => ({ time: index * 5, value: String(index % 2) })) },
        { id: "#", name: "reset_n", scope: "tb_top", width: 1, samples: [{ time: 0, value: "0" }, { time: 15, value: "1" }] },
        { id: "$", name: "counter[7:0]", scope: "tb_top.dut", width: 8, samples: [{ time: 0, value: "00000000" }, { time: 25, value: "00000001" }, { time: 45, value: "00000010" }, { time: 65, value: "00000011" }] },
        { id: "%", name: "led", scope: "tb_top.dut", width: 1, samples: [{ time: 0, value: "0" }, { time: 65, value: "1" }] },
      ],
    };
  },

  async readNetlist(root: string, project: string): Promise<NetlistGraph> {
    if (isDesktop()) return invoke<NetlistGraph>("read_netlist", { root, project });
    return {
      path: "projects/demo/build/top.json",
      creator: "Yosys browser preview",
      moduleName: "top",
      totalCells: 3,
      truncated: false,
      nodes: [
        { id: "port:clk", label: "clk", kind: "INPUT", detail: "1-bit top-level port" },
        { id: "counter", label: "counter[23:0]", kind: "Sequential", detail: "$dff" },
        { id: "reduce", label: "reduce", kind: "Logic", detail: "$reduce_and" },
        { id: "port:led", label: "led", kind: "OUTPUT", detail: "1-bit top-level port" },
      ],
      edges: [
        { id: "edge:0", source: "port:clk", target: "counter", nets: ["clk"] },
        { id: "edge:1", source: "counter", target: "reduce", nets: ["counter"] },
        { id: "edge:2", source: "reduce", target: "port:led", nets: ["led"] },
      ],
    };
  },

  async onBuildEvent(handler: (event: BuildEvent) => void): Promise<UnlistenFn> {
    if (isDesktop()) return listen<BuildEvent>("fpga-build-event", ({ payload }) => handler(payload));
    return () => undefined;
  },
};
