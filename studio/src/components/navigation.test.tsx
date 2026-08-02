// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useWorkbench } from "../store/workbench";
import { QuickLauncher } from "./QuickLauncher";
import { TitleBar } from "./TitleBar";

describe("native navigation controls", () => {
  beforeEach(() => {
    useWorkbench.setState({
      project: "UART command console",
      activePath: "rtl/top.sv",
      runningJob: null,
      diagnostics: [],
      build: null,
      theme: "dark",
      view: "welcome",
    });
  });

  afterEach(() => cleanup());

  it("opens real toolbar menus and dispatches build actions", () => {
    const run = vi.fn();
    render(<TitleBar onRun={run} onSave={vi.fn()}/>);
    fireEvent.click(screen.getByRole("button", { name: "Build" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Run simulation" }));
    expect(run).toHaveBeenCalledWith("sim");
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("opens the Ctrl-K action center and navigates to UART", () => {
    render(<QuickLauncher onRun={vi.fn()} onSave={vi.fn()}/>);
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(screen.getByRole("dialog", { name: "FPGA Studio action center" })).toBeTruthy();
    fireEvent.change(screen.getByRole("textbox", { name: "Search actions" }), { target: { value: "UART" } });
    fireEvent.click(screen.getByRole("button", { name: /Open UART terminal/i }));
    expect(useWorkbench.getState().view).toBe("uart");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
