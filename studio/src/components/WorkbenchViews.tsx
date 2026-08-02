import { useEffect, useMemo, useState } from "react";
import { Background, Controls, Handle, MiniMap, Position, ReactFlow, type NodeProps } from "@xyflow/react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, ArrowRight, BookOpen, Box, Cable, CheckCircle2, ChevronRight, CircuitBoard, Clock3, Cpu, Gauge, GitBranch, Lightbulb, MemoryStick, Network, Play, Plus, RefreshCw, Search, ShieldCheck, Sparkles, TerminalSquare, Waves, Zap } from "lucide-react";
import { bridge } from "../lib/bridge";
import { useWorkbench } from "../store/workbench";
import type { SerialDevice } from "../types";

const history = [
  { name: "#14", fmax: 58, lut: 2400 }, { name: "#15", fmax: 63, lut: 2280 }, { name: "#16", fmax: 61, lut: 2180 },
  { name: "#17", fmax: 68, lut: 2040 }, { name: "#18", fmax: 72.4, lut: 1842 },
];

function Metric({ label, value, note, icon: Icon, accent = "blue" }: { label: string; value: string; note: string; icon: typeof Cpu; accent?: string }): React.JSX.Element {
  return <article className={`metric-card accent-${accent}`}><div className="metric-icon"><Icon size={18} /></div><div><span>{label}</span><strong>{value}</strong><small>{note}</small></div></article>;
}

export function DashboardView(): React.JSX.Element {
  const build = useWorkbench((state) => state.build);
  const lutPercent = build?.lutUsed && build.lutTotal ? Math.round(build.lutUsed / build.lutTotal * 100) : 0;
  return <section className="feature-view dashboard-view">
    <div className="feature-header"><div><p className="eyebrow">Design intelligence</p><h1>Implementation overview</h1><p>Timing, utilization, and build health for the active project.</p></div><button className="secondary-button"><GitBranch size={15} /> Compare builds</button></div>
    <div className="metric-grid">
      <Metric label="Maximum frequency" value={build?.fmaxMHz ? `${build.fmaxMHz.toFixed(1)} MHz` : "Not built"} note={`Target ${build?.targetMHz?.toFixed(0) ?? 27} MHz`} icon={Gauge} accent="cyan" />
      <Metric label="Logic utilization" value={build?.lutUsed ? `${build.lutUsed.toLocaleString()} LUTs` : "—"} note={`${lutPercent}% of device`} icon={Cpu} accent="violet" />
      <Metric label="Worst slack" value={build?.worstSlackNs != null ? `${build.worstSlackNs >= 0 ? "+" : ""}${build.worstSlackNs.toFixed(2)} ns` : "—"} note="All clocks passing" icon={Clock3} accent="green" />
      <Metric label="Bitstream" value={build?.bitstreamBytes ? `${Math.round(build.bitstreamBytes / 1024)} KiB` : "—"} note="SRAM and flash ready" icon={MemoryStick} accent="amber" />
    </div>
    <div className="chart-grid">
      <article className="panel-card"><div className="card-title"><div><h2>Timing trend</h2><p>Maximum frequency across recent builds</p></div><span className="status-good"><CheckCircle2 size={13} /> passing</span></div><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={history}><defs><linearGradient id="freqFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--accent)" stopOpacity={0.45}/><stop offset="100%" stopColor="var(--accent)" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="var(--line-subtle)" vertical={false}/><XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11}/><YAxis stroke="var(--text-muted)" fontSize={11} domain={[0, 90]}/><Tooltip contentStyle={{ background: "var(--surface-raised)", border: "1px solid var(--line)", borderRadius: 8 }}/><Area type="monotone" dataKey="fmax" stroke="var(--accent)" fill="url(#freqFill)" strokeWidth={2}/></AreaChart></ResponsiveContainer></div></article>
      <article className="panel-card"><div className="card-title"><div><h2>Resource profile</h2><p>Current device occupancy</p></div><button className="text-button">Details <ChevronRight size={13}/></button></div><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={[{ type: "LUT", used: 1842, free: 18894 }, { type: "FF", used: 1106, free: 14446 }, { type: "BRAM", used: 4, free: 42 }, { type: "DSP", used: 2, free: 46 }]}><CartesianGrid stroke="var(--line-subtle)" vertical={false}/><XAxis dataKey="type" stroke="var(--text-muted)" fontSize={11}/><YAxis hide/><Tooltip contentStyle={{ background: "var(--surface-raised)", border: "1px solid var(--line)", borderRadius: 8 }}/><Bar dataKey="used" stackId="a" fill="var(--purple)" radius={[0,0,3,3]}/><Bar dataKey="free" stackId="a" fill="var(--surface-hover)" radius={[3,3,0,0]}/></BarChart></ResponsiveContainer></div></article>
    </div>
    <article className="panel-card path-card"><div className="card-title"><div><h2>Critical paths</h2><p>The three longest combinational paths</p></div><span>Slack</span></div>{["uart_tx/baud_counter → uart_tx/shift_reg", "pwm/channel_counter → pwm/compare", "control/state_reg → datapath/enable"].map((path, index) => <div className="path-row" key={path}><span className="rank">{index + 1}</span><code>{path}</code><span className="path-meter"><i style={{ width: `${80-index*18}%` }}/></span><strong>+{(8.12 + index*2.1).toFixed(2)} ns</strong></div>)}</article>
  </section>;
}

function LogicNode({ data }: NodeProps): React.JSX.Element {
  const info = data as { label: string; kind: string; detail: string };
  return <div className="logic-node"><Handle type="target" position={Position.Left}/><div className="logic-kind">{info.kind}</div><strong>{info.label}</strong><small>{info.detail}</small><Handle type="source" position={Position.Right}/></div>;
}

export function NetlistView(): React.JSX.Element {
  const nodes = useMemo(() => [
    { id: "clk", position: { x: 20, y: 110 }, data: { label: "clk", kind: "PORT", detail: "27 MHz input" }, type: "logic" },
    { id: "counter", position: { x: 250, y: 50 }, data: { label: "counter[23:0]", kind: "REGISTER", detail: "24 flip-flops" }, type: "logic" },
    { id: "reduce", position: { x: 490, y: 70 }, data: { label: "&counter", kind: "LOGIC", detail: "reduction AND" }, type: "logic" },
    { id: "led", position: { x: 720, y: 115 }, data: { label: "led", kind: "PORT", detail: "output" }, type: "logic" },
    { id: "reset", position: { x: 20, y: 250 }, data: { label: "reset_n", kind: "PORT", detail: "active low" }, type: "logic" },
  ], []);
  const edges = useMemo(() => [
    { id: "clk-counter", source: "clk", target: "counter", animated: true }, { id: "counter-reduce", source: "counter", target: "reduce" }, { id: "reduce-led", source: "reduce", target: "led", animated: true }, { id: "reset-counter", source: "reset", target: "counter" }, { id: "reset-led", source: "reset", target: "led" },
  ], []);
  return <section className="feature-view graph-view"><div className="feature-header compact"><div><p className="eyebrow">Elaborated design</p><h1>Netlist explorer</h1></div><div className="header-actions"><label className="inline-search"><Search size={14}/><input aria-label="Search netlist" placeholder="Find cell or net" /></label><button className="secondary-button"><Zap size={15}/> Critical path</button></div></div><div className="graph-shell"><div className="graph-breadcrumb"><Box size={14}/> top <ChevronRight size={13}/> blink_controller <span>5 nodes · 5 nets</span></div><ReactFlow nodes={nodes} edges={edges} nodeTypes={{ logic: LogicNode }} fitView colorMode="system"><Background color="var(--line-subtle)"/><Controls/><MiniMap pannable zoomable nodeColor="var(--accent)"/></ReactFlow></div></section>;
}

const signals = [
  { name: "clk", color: "#5eead4", points: "0,30 24,30 24,8 48,8 48,30 72,30 72,8 96,8 96,30 120,30 120,8 144,8 144,30 168,30 168,8 192,8 192,30 216,30 216,8 240,8 240,30 264,30 264,8 288,8 288,30 312,30 312,8 336,8 336,30 360,30 360,8 384,8 384,30 408,30 408,8 432,8 432,30 456,30 456,8 480,8 480,30" },
  { name: "reset_n", color: "#fbbf24", points: "0,30 48,30 48,8 480,8" },
  { name: "counter[23:0]", color: "#a78bfa", bus: true },
  { name: "led", color: "#60a5fa", points: "0,30 250,30 250,8 410,8 410,30 480,30" },
];

export function WaveformView(): React.JSX.Element {
  return <section className="feature-view waveform-view"><div className="feature-header compact"><div><p className="eyebrow">Simulation waveform</p><h1>build/waves.vcd</h1></div><div className="header-actions"><button className="secondary-button"><Plus size={14}/> Cursor</button><button className="secondary-button"><Play size={14}/> Run simulation</button></div></div><div className="wave-tools"><button><Search size={14}/> Find signal</button><button>−</button><span>50 µs/div</span><button>+</button><button>Fit</button><span className="wave-spacer"/><span className="cursor-readout">A 12.400 µs</span><span className="cursor-readout">Δ 3.200 µs</span></div><div className="wave-shell"><div className="signal-list"><div className="signal-header">SIGNALS</div>{signals.map((signal) => <div className="signal-row" key={signal.name}><span style={{ background: signal.color }}/><code>{signal.name}</code><small>{signal.bus ? "00A3FC" : signal.name === "clk" ? "1" : "0"}</small></div>)}</div><div className="wave-canvas"><div className="time-ruler">{[0,10,20,30,40,50].map((n) => <span key={n}>{n} µs</span>)}</div><div className="cursor-line" style={{ left: "52%" }}><span>A</span></div>{signals.map((signal, index) => <div className="wave-row" key={signal.name}>{signal.bus ? <svg viewBox="0 0 480 38" preserveAspectRatio="none"><path d="M0 7 L12 30 L88 30 L100 7 L172 7 L184 30 L260 30 L272 7 L356 7 L368 30 L450 30 L462 7 L480 7" fill="none" stroke={signal.color} strokeWidth="2"/><text x="105" y="22" fill={signal.color} fontSize="12">0001</text><text x="278" y="22" fill={signal.color} fontSize="12">00A3FC</text></svg> : <svg viewBox="0 0 480 38" preserveAspectRatio="none"><polyline points={signal.points} transform="translate(0 2)" fill="none" stroke={signal.color} strokeWidth="2" vectorEffect="non-scaling-stroke"/></svg>}<span className="wave-value" style={{ color: signal.color }}>{index === 0 ? "clock" : ""}</span></div>)}</div></div></section>;
}

export function HardwareView(): React.JSX.Element {
  const [devices, setDevices] = useState<SerialDevice[]>([]);
  const [scanning, setScanning] = useState(false);
  const scan = async () => { setScanning(true); try { setDevices(await bridge.serialDevices()); } finally { setScanning(false); } };
  useEffect(() => { void scan(); }, []);
  return <section className="feature-view"><div className="feature-header"><div><p className="eyebrow">Connected systems</p><h1>Hardware manager</h1><p>Inspect programmers, target boards, and serial interfaces before programming.</p></div><button className="primary-button" onClick={() => void scan()}><RefreshCw className={scanning ? "spin" : ""} size={15}/> Scan devices</button></div><div className="hardware-grid"><article className="device-card featured"><div className="device-visual"><CircuitBoard size={42}/><span className="pulse-ring"/></div><div><span className="status-good"><span className="online-dot"/> READY</span><h2>Tang Primer 20K</h2><p>GW2A-LV18PG256C8/I7 · 20,736 LUT4</p><div className="device-facts"><span><Clock3 size={14}/> 27 MHz</span><span><Zap size={14}/> 3.3 V I/O</span><span><ShieldCheck size={14}/> JTAG verified</span></div></div><button className="secondary-button">Diagnostics <ArrowRight size={14}/></button></article><article className="panel-card"><div className="card-title"><div><h2>Interfaces</h2><p>Detected local serial endpoints</p></div><Cable size={19}/></div>{devices.length ? devices.map((device) => <div className="interface-row" key={device.portName}><div className="port-icon"><TerminalSquare size={17}/></div><div><strong>{device.portName}</strong><span>{device.displayName}</span></div>{device.likelyBoard && <span className="tag">Likely board</span>}</div>) : <div className="empty-small">No serial devices detected.</div>}</article></div><article className="safety-card"><ShieldCheck size={22}/><div><h3>Safe programming workflow</h3><p>SRAM upload is volatile. Flash persists after power-off and asks for confirmation before the write starts. FPGA Studio never replaces the UART interface driver.</p></div></article></section>;
}

export function UartView(): React.JSX.Element {
  return <section className="feature-view uart-view"><div className="feature-header compact"><div><p className="eyebrow">Serial laboratory</p><h1>UART terminal</h1></div><button className="primary-button"><Plus size={15}/> New connection</button></div><div className="uart-toolbar"><label>Port <select defaultValue="COM5"><option>COM5</option><option>Auto-detect</option></select></label><label>Baud <select defaultValue="115200"><option>9600</option><option>57600</option><option>115200</option><option>921600</option></select></label><span>8 data · none · 1 stop</span><button className="connect-button"><span className="online-dot"/> Connected</button></div><div className="terminal-screen"><div className="terminal-line muted">[14:22:09.102] Connected to COM5 at 115200 baud</div><div className="terminal-line rx"><span>RX</span> Tang Primer 20K UART demo</div><div className="terminal-line rx"><span>RX</span> Counter: 00000142  LED: ON</div><div className="terminal-line tx"><span>TX</span> status</div><div className="terminal-line rx"><span>RX</span> FMAX 72.4 MHz | temperature N/A</div><div className="terminal-cursor">▌</div></div><div className="terminal-input"><span>&gt;</span><input aria-label="UART message" placeholder="Type a message, Enter to send"/><button>Send</button></div></section>;
}

export function WelcomeView(): React.JSX.Element {
  const { setView } = useWorkbench();
  return <section className="welcome-view"><div className="welcome-hero"><div className="welcome-logo"><CircuitBoard size={32}/></div><p className="eyebrow">FPGA Studio 2.0</p><h1>Build hardware with clarity.</h1><p>A focused, local-first workspace that teaches the flow while giving experienced designers the controls they expect.</p><div className="welcome-actions"><button className="primary-button"><Plus size={16}/> New FPGA project</button><button className="secondary-button" onClick={() => setView("dashboard")}><Activity size={16}/> Open insights</button></div></div><div className="welcome-columns"><article><h2>Start</h2>{["Create from a verified template", "Open an existing project", "Clone a Git repository"].map((item) => <button className="start-link" key={item}><ChevronRight size={14}/>{item}</button>)}</article><article><h2>Learn</h2>{[{i:Lightbulb,t:"Your first LED design",s:"10 min"},{i:Waves,t:"Read a simulation waveform",s:"12 min"},{i:Network,t:"Understand the synthesized netlist",s:"15 min"}].map(({i:Icon,t,s}) => <button className="lesson-card" key={t}><Icon size={18}/><span><strong>{t}</strong><small>{s}</small></span><ArrowRight size={14}/></button>)}</article><article><h2>What’s new</h2><div className="release-card"><span className="release-version">2.0 PREVIEW</span><h3>A professional workspace, rebuilt</h3><ul><li>Native Tauri security boundary</li><li>Integrated design intelligence</li><li>Accessible light and dark themes</li><li>Hardware-first diagnostics</li></ul><button className="text-button"><BookOpen size={14}/> Read release notes</button></div></article></div><div className="welcome-tip"><Sparkles size={16}/><span><strong>Intelligent tip:</strong> run simulation before synthesis to catch functional mistakes in seconds.</span></div></section>;
}
