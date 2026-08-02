import { useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, CircleAlert, CircleX, Copy, Eraser, Info, TerminalSquare } from "lucide-react";
import { useWorkbench } from "../store/workbench";
import type { BottomPanel } from "../types";

const panels: Array<{ id: BottomPanel; label: string }> = [
  { id: "problems", label: "Problems" }, { id: "output", label: "Output" }, { id: "terminal", label: "Terminal" }, { id: "waveform", label: "Waveform log" },
];

export function BottomDock(): React.JSX.Element {
  const { bottomPanel, bottomOpen, setBottomPanel, toggleBottom, diagnostics, clearOutput } = useWorkbench();
  return <section className={`bottom-dock ${bottomOpen ? "open" : "closed"}`}>
    <div className="dock-tabs">
      {panels.map((panel) => <button className={panel.id === bottomPanel ? "active" : ""} key={panel.id} onClick={() => setBottomPanel(panel.id)}>{panel.label}{panel.id === "problems" && diagnostics.length > 0 && <span className="count-badge">{diagnostics.length}</span>}</button>)}
      <span className="dock-spacer" />
      <button className="dock-icon" onClick={clearOutput} title="Clear output"><Eraser size={14}/></button>
      <button className="dock-icon" title="Copy"><Copy size={14}/></button>
      <button className="dock-icon" onClick={toggleBottom} title={bottomOpen ? "Collapse panel" : "Expand panel"}>{bottomOpen ? <ChevronDown size={15}/> : <ChevronUp size={15}/>}</button>
    </div>
    {bottomOpen && <div className="dock-content">
      {bottomPanel === "problems" ? <Problems/> : bottomPanel === "terminal" ? <Terminal/> : <Output/>}
    </div>}
  </section>;
}

function Problems(): React.JSX.Element {
  const diagnostics = useWorkbench((state) => state.diagnostics);
  if (!diagnostics.length) return <div className="empty-dock"><CheckCircle2 size={18}/><span>No problems detected in the active project.</span></div>;
  return <div className="problem-list">{diagnostics.map((item, index) => <div className={`problem-row ${item.severity}`} key={`${item.message}-${index}`}>{item.severity === "error" ? <CircleX size={14}/> : item.severity === "warning" ? <CircleAlert size={14}/> : <Info size={14}/>}<span>{item.message}</span><code>{item.file}{item.line ? `:${item.line}` : ""}</code><small>{item.source}</small></div>)}</div>;
}

function Output(): React.JSX.Element {
  const output = useWorkbench((state) => state.output);
  const [technical, setTechnical] = useState(false);
  if (!output.length) return <div className="empty-dock"><TerminalSquare size={18}/><span>Build and tool output will appear here.</span></div>;
  const isTechnical = (message: string) => /^\s*(?:At .+:\d+ char:\d+|\+|~+|CategoryInfo|FullyQualifiedErrorId)/.test(message) || !message.trim();
  const hidden = output.filter((event) => isTechnical(event.message)).length;
  const visible = technical ? output : output.filter((event) => !isTechnical(event.message));
  return <div className="output-view"><div className="output-options"><span>{technical ? "Complete tool output" : "Beginner-friendly output"}</span>{hidden > 0 && <button onClick={() => setTechnical((value) => !value)}>{technical ? "Hide technical details" : `Show ${hidden} technical detail${hidden === 1 ? "" : "s"}`}</button>}</div><div className="output-lines" aria-live="polite">{visible.map((event, index) => <div className={event.stream} key={`${event.timestamp}-${index}`}><span>{new Date(event.timestamp).toLocaleTimeString([], { hour12: false })}</span><strong>{event.phase}</strong><code>{event.message}</code></div>)}</div></div>;
}

function Terminal(): React.JSX.Element {
  return <div className="mini-terminal"><div><span className="prompt">PS</span> FPGA_DEV_ENV&gt; <span className="command">.\fpga.ps1 doctor</span></div><div className="terminal-ok"><CheckCircle2 size={13}/> Toolchain ready · Tang Primer 20K profile loaded</div><div><span className="prompt">PS</span> FPGA_DEV_ENV&gt; <span className="terminal-caret">▌</span></div></div>;
}
