import { useCallback, useEffect } from "react";
import { ActivityBar } from "./components/ActivityBar";
import { BottomDock } from "./components/BottomDock";
import { CommandBar } from "./components/CommandBar";
import { EditorWorkspace } from "./components/EditorWorkspace";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Sidebar } from "./components/Sidebar";
import { StatusBar } from "./components/StatusBar";
import { TitleBar } from "./components/TitleBar";
import { ProjectWizard } from "./components/ProjectWizard";
import { ReleaseNotes } from "./components/ReleaseNotes";
import { DashboardView, HardwareView, NetlistView, UartView, WaveformView, WelcomeView } from "./components/WorkbenchViews";
import { bridge } from "./lib/bridge";
import { useWorkbench } from "./store/workbench";
import type { BuildAction, BuildEvent, WorkbenchView } from "./types";

const viewComponents: Record<Exclude<WorkbenchView, "editor">, React.ComponentType> = {
  dashboard: DashboardView,
  netlist: NetlistView,
  waveform: WaveformView,
  hardware: HardwareView,
  uart: UartView,
  welcome: WelcomeView,
};

function Workbench(): React.JSX.Element {
  const store = useWorkbench();

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const apply = () => document.documentElement.dataset.theme = store.theme === "system" ? (media.matches ? "light" : "dark") : store.theme;
    const resetViewport = () => window.scrollTo({ left: 0, top: 0 });
    apply();
    resetViewport();
    media.addEventListener("change", apply);
    window.addEventListener("resize", resetViewport);
    return () => {
      media.removeEventListener("change", apply);
      window.removeEventListener("resize", resetViewport);
    };
  }, [store.theme]);

  useEffect(() => {
    const shortcuts = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "l") {
        event.preventDefault();
        store.setTheme(store.theme === "light" ? "dark" : "light");
      }
    };
    window.addEventListener("keydown", shortcuts);
    return () => window.removeEventListener("keydown", shortcuts);
  }, [store.theme]);

  useEffect(() => {
    let disposed = false;
    void (async () => {
      const snapshot = await bridge.workspaceSnapshot();
      if (disposed) return;
      store.setWorkspace(snapshot.root, snapshot.project, snapshot.projectPath, snapshot.tree);
      const summary = await bridge.buildSummary(snapshot.root, snapshot.projectPath);
      if (!disposed) store.setBuild(summary);
    })().catch((error: unknown) => {
      store.appendOutput({ jobId: "startup", phase: "workspace", stream: "stderr", message: error instanceof Error ? error.message : String(error), timestamp: new Date().toISOString() });
    });
    let unlisten: (() => void) | undefined;
    void bridge.onBuildEvent((event: BuildEvent) => store.appendOutput(event)).then((stop) => { unlisten = stop; });
    return () => { disposed = true; unlisten?.(); };
  }, []);

  const run = useCallback(async (action: BuildAction) => {
    if (store.runningJob) return;
    const optimisticId = `starting-${Date.now()}`;
    store.setRunningJob(optimisticId);
    store.setBottomPanel("output");
    store.appendOutput({ jobId: optimisticId, phase: action, stream: "system", message: `Starting ${action}…`, timestamp: new Date().toISOString() });
    try {
      const result = await bridge.run(store.root, store.projectPath, action, optimisticId);
      store.setDiagnostics(result.diagnostics);
      store.appendOutput({ jobId: result.jobId, phase: action, stream: result.success ? "system" : "stderr", message: result.success ? `Completed in ${(result.durationMs / 1000).toFixed(1)}s` : `Failed with exit code ${result.exitCode ?? "unknown"}`, timestamp: new Date().toISOString() });
      store.setBuild(await bridge.buildSummary(store.root, store.projectPath));
    } catch (error) {
      store.appendOutput({ jobId: optimisticId, phase: action, stream: "stderr", message: error instanceof Error ? error.message : String(error), timestamp: new Date().toISOString() });
    } finally {
      store.setRunningJob(null);
    }
  }, [store]);

  const save = useCallback(async () => {
    const active = store.tabs.find((tab) => tab.path === store.activePath);
    if (!active) return;
    await bridge.writeText(store.root, active.path, active.content);
    store.markSaved(active.path);
    store.appendOutput({ jobId: "editor", phase: "save", stream: "system", message: `Saved ${active.path}`, timestamp: new Date().toISOString() });
  }, [store]);

  const stop = useCallback(async () => {
    if (store.runningJob) await bridge.cancel(store.runningJob);
  }, [store.runningJob]);

  const View = store.view === "editor" ? EditorWorkspace : viewComponents[store.view];
  return <><div className="app-shell">
    <TitleBar />
    <div className="workbench-shell">
      <ActivityBar />
      {store.sidebarOpen && <Sidebar />}
      <main className="main-area">
        <CommandBar onRun={(action) => void run(action)} onSave={() => void save()} onStop={() => void stop()} />
        <div className="content-and-dock"><div className="content-surface"><View /></div><BottomDock /></div>
      </main>
    </div>
    <StatusBar />
  </div><ProjectWizard /><ReleaseNotes /></>;
}

export function App(): React.JSX.Element {
  return <ErrorBoundary><Workbench /></ErrorBoundary>;
}
