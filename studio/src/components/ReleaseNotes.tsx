import { useState } from "react";
import { BarChart3, Boxes, CircuitBoard, FolderPlus, Network, ShieldCheck, Waves, X } from "lucide-react";
import { markReleaseNotesSeen, releaseNotesPending, RELEASE_NOTES_VERSION } from "../lib/release-notes";

const highlights = [
  { icon: FolderPlus, title: "Guided project creation", text: "Six verified starting points for fundamentals, UART, SPI, PWM, VGA, and RISC-V learning." },
  { icon: Waves, title: "Integrated VCD waveforms", text: "Inspect real scoped simulation signals without leaving the workspace." },
  { icon: Network, title: "Synthesized netlist explorer", text: "Navigate actual Yosys ports, cells, categories, and net connections." },
  { icon: CircuitBoard, title: "Honest hardware diagnostics", text: "Real COM discovery, explicit JTAG verification, safe SRAM/flash boundaries, and driver guidance." },
  { icon: BarChart3, title: "Build intelligence", text: "Local timing, utilization, job history, diagnostics, and reproducible outputs." },
  { icon: Boxes, title: "72 reviewed HDL patterns", text: "Search learning examples and insert them directly into an open design." },
];

export function ReleaseNotes(): React.JSX.Element | null {
  const [open, setOpen] = useState(releaseNotesPending);
  if (!open) return null;
  const close = () => { markReleaseNotesSeen(); setOpen(false); };
  return <div className="release-overlay" role="presentation"><section className="release-dialog" role="dialog" aria-modal="true" aria-labelledby="release-title"><div className="release-top"><div className="release-symbol"><CircuitBoard size={27}/></div><div><span>FPGA STUDIO {RELEASE_NOTES_VERSION}</span><h2 id="release-title">Your hardware workspace grew up.</h2><p>A local-first major release designed to teach clearly and stay useful as your projects become serious.</p></div><button className="release-close" onClick={close} aria-label="Close release notes"><X size={18}/></button></div><div className="release-highlights">{highlights.map(({ icon: Icon, title, text }) => <article key={title}><Icon size={18}/><div><h3>{title}</h3><p>{text}</p></div></article>)}</div><div className="release-safety"><ShieldCheck size={18}/><span><strong>Privacy and safety:</strong> builds, source code, waveforms, and analytics remain on this computer. Persistent flash always requires an explicit action.</span></div><div className="release-actions"><span>Release notes appear once per version and remain available from Help.</span><button className="primary-button" onClick={close}>Explore FPGA Studio</button></div></section></div>;
}
