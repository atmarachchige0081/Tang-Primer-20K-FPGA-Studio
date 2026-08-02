import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type {
  BuildAction,
  BuildEvent,
  BuildSummary,
  CommandResult,
  ProjectNode,
  SerialDevice,
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

  async run(root: string, project: string, action: BuildAction, jobId: string): Promise<CommandResult> {
    if (isDesktop()) return invoke<CommandResult>("run_fpga_command", { root, project, action, jobId });
    await new Promise((resolve) => window.setTimeout(resolve, 500));
    return { jobId, action, success: true, exitCode: 0, durationMs: 500, diagnostics: [] };
  },

  async cancel(jobId: string): Promise<boolean> {
    return isDesktop() ? invoke<boolean>("cancel_job", { jobId }) : false;
  },

  async buildSummary(root: string, project: string): Promise<BuildSummary> {
    if (isDesktop()) return invoke<BuildSummary>("read_build_summary", { root, project });
    return { status: "ready", fmaxMHz: 72.4, targetMHz: 27, lutUsed: 1842, lutTotal: 20736, registersUsed: 1106, registersTotal: 15552, bitstreamBytes: 142336, worstSlackNs: 8.12, updatedAt: new Date().toISOString() };
  },

  async serialDevices(): Promise<SerialDevice[]> {
    if (isDesktop()) return invoke<SerialDevice[]>("list_serial_devices");
    return [{ portName: "COM5", displayName: "Tang Primer Debugger UART (preview)", likelyBoard: true }];
  },

  async onBuildEvent(handler: (event: BuildEvent) => void): Promise<UnlistenFn> {
    if (isDesktop()) return listen<BuildEvent>("fpga-build-event", ({ payload }) => handler(payload));
    return () => undefined;
  },
};
