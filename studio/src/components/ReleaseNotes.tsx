import { useEffect, useState } from "react";
import { BarChart3, CircuitBoard, Clock3, GitBranch, ListChecks, ScanSearch, ShieldCheck, X } from "lucide-react";
import { markReleaseNotesSeen, releaseNotesPending, RELEASE_NOTES_VERSION } from "../lib/release-notes";

const highlights = [
  { icon: ScanSearch, title: "Conservative HDL analysis", text: "Stable finding codes, clear fixes, and diagnostics only where the live scanner has reliable evidence." },
  { icon: GitBranch, title: "RTL architecture map", text: "See module hierarchy, instances, top selection, and detected clock/reset domains before synthesis." },
  { icon: ListChecks, title: "Verification center", text: "An honest PASS, FAIL, WARNING, or NOT RUN trail built from sources, artifacts, and job history." },
  { icon: Clock3, title: "Full timing intelligence", text: "All reported clocks, achieved frequency, slack, and longest real place-and-route paths." },
  { icon: BarChart3, title: "Complete device utilization", text: "Review every resource class reported by nextpnr, including LUTs, FFs, RAM, DSP, I/O, clocks, and PLLs." },
  { icon: CircuitBoard, title: "User-confirmed hardware evidence", text: "Record the behavior you actually observed; JTAG and programming success are never misrepresented as functional proof." },
];

export function ReleaseNotes(): React.JSX.Element | null {
  const capture = import.meta.env.DEV ? new URLSearchParams(window.location.search).get("capture") : null;
  const [open, setOpen] = useState(() => capture === "release-notes" || (!capture && releaseNotesPending()));
  useEffect(() => {
    const reveal = () => setOpen(true);
    window.addEventListener("fpga-studio:release-notes", reveal);
    return () => window.removeEventListener("fpga-studio:release-notes", reveal);
  }, []);
  if (!open) return null;
  const close = () => { markReleaseNotesSeen(); setOpen(false); };
  return <div className="release-overlay" role="presentation"><section className="release-dialog" role="dialog" aria-modal="true" aria-labelledby="release-title"><div className="release-top"><div className="release-symbol"><CircuitBoard size={27}/></div><div><span>FPGA STUDIO {RELEASE_NOTES_VERSION}</span><h2 id="release-title">Design intelligence you can trust.</h2><p>Release 2.1 connects RTL understanding, implementation evidence, and hardware truth in one professional workflow.</p></div><button className="release-close" onClick={close} aria-label="Close release notes"><X size={18}/></button></div><div className="release-highlights">{highlights.map(({ icon: Icon, title, text }) => <article key={title}><Icon size={18}/><div><h3>{title}</h3><p>{text}</p></div></article>)}</div><div className="release-safety"><ShieldCheck size={18}/><span><strong>Honest by design:</strong> ambiguous HDL remains unclaimed, stale artifacts are warnings, and hardware behavior passes only after an explicit observed result.</span></div><div className="release-actions"><span>Release notes appear once per version and remain available from Help.</span><button className="primary-button" onClick={close}>Explore FPGA Studio 2.1</button></div></section></div>;
}
