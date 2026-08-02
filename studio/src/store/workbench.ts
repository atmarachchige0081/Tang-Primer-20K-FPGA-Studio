import { create } from "zustand";
import type { Activity, BottomPanel, BuildEvent, BuildSummary, Diagnostic, OpenFile, ProjectNode, ThemeMode, WorkbenchView } from "../types";

interface WorkbenchState {
  ready: boolean;
  root: string;
  project: string;
  projectPath: string;
  tree: ProjectNode[];
  activity: Activity;
  view: WorkbenchView;
  bottomPanel: BottomPanel;
  bottomOpen: boolean;
  sidebarOpen: boolean;
  theme: ThemeMode;
  tabs: OpenFile[];
  activePath: string | null;
  output: BuildEvent[];
  diagnostics: Diagnostic[];
  build: BuildSummary | null;
  runningJob: string | null;
  setWorkspace: (root: string, project: string, projectPath: string, tree: ProjectNode[]) => void;
  setActivity: (activity: Activity) => void;
  setView: (view: WorkbenchView) => void;
  setBottomPanel: (panel: BottomPanel) => void;
  toggleBottom: () => void;
  toggleSidebar: () => void;
  setTheme: (theme: ThemeMode) => void;
  openFile: (file: OpenFile) => void;
  closeFile: (path: string) => void;
  updateFile: (path: string, content: string) => void;
  markSaved: (path: string) => void;
  appendOutput: (event: BuildEvent) => void;
  clearOutput: () => void;
  setDiagnostics: (items: Diagnostic[]) => void;
  setBuild: (summary: BuildSummary) => void;
  setRunningJob: (jobId: string | null) => void;
}

const storedTheme = (localStorage.getItem("fpga-studio.theme") as ThemeMode | null) ?? "dark";

export const useWorkbench = create<WorkbenchState>((set) => ({
  ready: false,
  root: "",
  project: "",
  projectPath: ".",
  tree: [],
  activity: "explorer",
  view: "welcome",
  bottomPanel: "output",
  bottomOpen: true,
  sidebarOpen: true,
  theme: storedTheme,
  tabs: [],
  activePath: null,
  output: [],
  diagnostics: [],
  build: null,
  runningJob: null,
  setWorkspace: (root, project, projectPath, tree) => set({ root, project, projectPath, tree, ready: true }),
  setActivity: (activity) => set({ activity, sidebarOpen: true }),
  setView: (view) => set({ view }),
  setBottomPanel: (bottomPanel) => set({ bottomPanel, bottomOpen: true }),
  toggleBottom: () => set((state) => ({ bottomOpen: !state.bottomOpen })),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setTheme: (theme) => {
    localStorage.setItem("fpga-studio.theme", theme);
    set({ theme });
  },
  openFile: (file) => set((state) => ({
    tabs: state.tabs.some((tab) => tab.path === file.path) ? state.tabs : [...state.tabs, file],
    activePath: file.path,
    view: "editor",
  })),
  closeFile: (path) => set((state) => {
    const index = state.tabs.findIndex((tab) => tab.path === path);
    const tabs = state.tabs.filter((tab) => tab.path !== path);
    const fallback = tabs[Math.max(0, index - 1)]?.path ?? tabs[0]?.path ?? null;
    return { tabs, activePath: state.activePath === path ? fallback : state.activePath, view: tabs.length ? state.view : "welcome" };
  }),
  updateFile: (path, content) => set((state) => ({ tabs: state.tabs.map((tab) => tab.path === path ? { ...tab, content } : tab) })),
  markSaved: (path) => set((state) => ({ tabs: state.tabs.map((tab) => tab.path === path ? { ...tab, savedContent: tab.content } : tab) })),
  appendOutput: (event) => set((state) => ({ output: [...state.output.slice(-1999), event] })),
  clearOutput: () => set({ output: [] }),
  setDiagnostics: (diagnostics) => set({ diagnostics }),
  setBuild: (build) => set({ build }),
  setRunningJob: (runningJob) => set({ runningJob }),
}));
