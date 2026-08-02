import { beforeEach, describe, expect, it } from "vitest";
import { useWorkbench } from "./workbench";

const source = {
  path: "rtl/top.sv",
  name: "top.sv",
  language: "systemverilog",
  content: "module top; endmodule\n",
  savedContent: "module top; endmodule\n",
};

describe("workbench document state", () => {
  beforeEach(() => {
    useWorkbench.setState({ tabs: [], activePath: null, view: "welcome", output: [], diagnostics: [], runningJob: null });
  });

  it("opens each document only once", () => {
    useWorkbench.getState().openFile(source);
    useWorkbench.getState().openFile(source);
    expect(useWorkbench.getState().tabs).toHaveLength(1);
    expect(useWorkbench.getState().activePath).toBe(source.path);
  });

  it("tracks dirty and saved source content", () => {
    useWorkbench.getState().openFile(source);
    useWorkbench.getState().updateFile(source.path, "module changed; endmodule\n");
    let tab = useWorkbench.getState().tabs[0];
    expect(tab?.content).not.toBe(tab?.savedContent);
    useWorkbench.getState().markSaved(source.path);
    tab = useWorkbench.getState().tabs[0];
    expect(tab?.content).toBe(tab?.savedContent);
  });

  it("bounds streamed output to 2,000 entries", () => {
    for (let index = 0; index < 2_050; index += 1) {
      useWorkbench.getState().appendOutput({ jobId: "test", phase: "sim", stream: "stdout", message: String(index), timestamp: new Date(0).toISOString() });
    }
    expect(useWorkbench.getState().output).toHaveLength(2_000);
    expect(useWorkbench.getState().output[0]?.message).toBe("50");
  });
});
