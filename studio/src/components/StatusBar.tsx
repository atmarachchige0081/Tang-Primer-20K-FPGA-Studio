import { AlertTriangle, Bell, CheckCircle2, GitBranch, Radio, ShieldCheck, Wifi } from "lucide-react";
import { bridge } from "../lib/bridge";
import { useWorkbench } from "../store/workbench";

export function StatusBar(): React.JSX.Element {
  const { diagnostics, activePath, tabs, build, runningJob, git } = useWorkbench();
  const active = tabs.find((tab) => tab.path === activePath);
  const errors = diagnostics.filter((item) => item.severity === "error").length;
  const warnings = diagnostics.filter((item) => item.severity === "warning").length;
  return <footer className="statusbar"><div className="status-left"><button title={git?.message}><GitBranch size={13}/> {git?.repository ? git.branch ?? "detached" : git?.available === false ? "Git missing" : "Git..."}</button><button><ShieldCheck size={13}/> local only</button><button><CheckCircle2 size={13}/> {errors}</button><button><AlertTriangle size={13}/> {warnings}</button></div><div className="status-right">{runningJob && <span className="status-running"><span className="status-spinner"/> FPGA job running</span>}<button><Radio size={13}/> {build?.status ?? "ready"}</button><button><Wifi size={13}/> {bridge.isDesktop() ? "Desktop" : "Browser preview"}</button>{active && <><button>Ln 1, Col 1</button><button>{active.language}</button><button>UTF-8</button></>}<button><Bell size={13}/></button></div></footer>;
}
