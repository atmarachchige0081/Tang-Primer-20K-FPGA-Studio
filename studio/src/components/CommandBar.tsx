import { BarChart3, Bug, CircuitBoard, Cpu, LoaderCircle, Network, Play, Radio, Rocket, Save, Square, Upload, Waves } from "lucide-react";
import type { BuildAction, WorkbenchView } from "../types";
import { useWorkbench } from "../store/workbench";

interface Props { onRun: (action: BuildAction) => void; onSave: () => void; onStop: () => void }

export function CommandBar({ onRun, onSave, onStop }: Props): React.JSX.Element {
  const { runningJob, setView } = useWorkbench();
  const nav = (view: WorkbenchView, title: string, Icon: typeof BarChart3) => <button className="tool-button" onClick={() => setView(view)} title={title}><Icon size={16} /><span>{title}</span></button>;
  return (
    <div className="commandbar">
      <div className="command-group">
        <button className="tool-button" onClick={onSave} title="Save active file"><Save size={16} /><span>Save</span></button>
        <span className="tool-separator" />
        <button className="tool-button" onClick={() => onRun("lint")} disabled={Boolean(runningJob)}><Bug size={16} /><span>Lint</span></button>
        <button className="tool-button" onClick={() => onRun("sim")} disabled={Boolean(runningJob)}><Play size={16} /><span>Simulate</span></button>
        <button className="primary-tool" onClick={() => onRun("build")} disabled={Boolean(runningJob)}>{runningJob ? <LoaderCircle className="spin" size={16} /> : <Rocket size={16} />}<span>{runningJob ? "Building…" : "Build"}</span></button>
        <button className="tool-button" onClick={() => onRun("upload")} disabled={Boolean(runningJob)} title="Load volatile SRAM"><Upload size={16} /><span>SRAM</span></button>
        {runningJob && <button className="stop-tool" onClick={onStop}><Square size={14} /> Stop</button>}
      </div>
      <div className="command-group view-tools">
        {nav("dashboard", "Insights", BarChart3)}
        {nav("waveform", "Waveform", Waves)}
        {nav("netlist", "Netlist", Network)}
        {nav("hardware", "Hardware", CircuitBoard)}
        {nav("uart", "UART", Radio)}
      </div>
      <div className="target-pill"><Cpu size={15} /><span>Tang Primer 20K</span><span className="online-dot" /><span>27 MHz</span></div>
    </div>
  );
}
