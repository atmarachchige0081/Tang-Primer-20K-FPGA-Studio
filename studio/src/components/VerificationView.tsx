import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, CircleDashed, Clock3, Play, RefreshCw, ShieldCheck, Upload, XCircle, Zap } from "lucide-react";
import { bridge } from "../lib/bridge";
import { useWorkbench } from "../store/workbench";
import type { BuildAction, VerificationStageStatus, VerificationSummary } from "../types";

interface Props { onRun: (action: BuildAction) => void }

const statusLabel: Record<VerificationStageStatus, string> = { pass: "PASS", fail: "FAIL", warning: "WARNING", notRun: "NOT RUN" };
const actionForStage = (id: string): BuildAction | null => ({ lint: "lint", simulation: "sim", synthesis: "build", timing: "build", resources: "build", bitstream: "build", jtag: "detect", programming: "upload" } as Record<string, BuildAction>)[id] ?? null;

export function VerificationView({ onRun }: Props): React.JSX.Element {
  const root = useWorkbench((state) => state.root);
  const project = useWorkbench((state) => state.projectPath);
  const running = useWorkbench((state) => Boolean(state.runningJob));
  const [summary, setSummary] = useState<VerificationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [evidenceNote, setEvidenceNote] = useState("");
  const [recording, setRecording] = useState(false);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!root) return;
    setLoading(true);
    setError(null);
    try { setSummary(await bridge.verificationSummary(root, project)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); }
    finally { setLoading(false); }
  }, [root, project]);

  useEffect(() => {
    void load();
    const refresh = () => void load();
    window.addEventListener("fpga-studio:verification-refresh", refresh);
    return () => window.removeEventListener("fpga-studio:verification-refresh", refresh);
  }, [load]);

  const runStage = (id: string) => {
    const action = actionForStage(id);
    if (action) onRun(action);
  };
  const recordEvidence = async (passed: boolean) => {
    setRecording(true);
    setEvidenceError(null);
    try {
      setSummary(await bridge.recordHardwareVerification(root, project, passed, evidenceNote));
      setEvidenceNote("");
    } catch (reason) {
      setEvidenceError(reason instanceof Error ? reason.message : String(reason));
    } finally { setRecording(false); }
  };

  if (loading && !summary) return <section className="feature-view"><div className="feature-header"><div><p className="eyebrow">Verification center</p><h1>Building evidence trail</h1><p>Checking live sources, artifacts, timing, and recorded tool runs.</p></div></div><div className="verification-skeleton">{Array.from({ length: 6 }, (_, index) => <span key={index}/>)}</div></section>;
  if (error && !summary) return <section className="feature-view"><div className="view-state error-state"><XCircle size={26}/><strong>Verification state is unavailable</strong><p>{error}</p><button className="primary-button" onClick={() => void load()}><RefreshCw size={14}/> Retry</button></div></section>;

  return <section className="feature-view verification-view">
    <div className="feature-header"><div><p className="eyebrow">Verification center</p><h1>Evidence, not assumptions</h1><p>Every stage is derived from current sources, real artifacts, or recorded tool runs.</p></div><button className="secondary-button" onClick={() => void load()} disabled={loading}><RefreshCw className={loading ? "spin" : ""} size={15}/> Refresh evidence</button></div>
    {summary && <>
      <div className="verification-hero">
        <div className={`verification-score ${summary.failed ? "fail" : summary.warnings ? "warning" : "pass"}`}><ShieldCheck size={28}/><strong>{summary.passed}/{summary.stages.length}</strong><span>stages passed</span></div>
        <div className="verification-next"><span>RECOMMENDED NEXT ACTION</span><h2>{summary.nextAction}</h2><p>{summary.failed} failed · {summary.warnings} warning · {summary.notRun} not run</p></div>
        <div className="verification-legend"><span className="pass"><CheckCircle2 size={14}/> {summary.passed} pass</span><span className="fail"><XCircle size={14}/> {summary.failed} fail</span><span className="warning"><AlertTriangle size={14}/> {summary.warnings} warning</span><span className="notRun"><CircleDashed size={14}/> {summary.notRun} not run</span></div>
      </div>
      <div className="pipeline-rail" aria-label="Verification pipeline">{summary.stages.map((stage) => <span className={stage.status} key={stage.id} title={`${stage.label}: ${statusLabel[stage.status]}`}/>)}</div>
      <div className="verification-grid">{summary.stages.map((stage, index) => {
        const action = actionForStage(stage.id);
        const Icon = stage.status === "pass" ? CheckCircle2 : stage.status === "fail" ? XCircle : stage.status === "warning" ? AlertTriangle : CircleDashed;
        return <article className={`verification-stage ${stage.status}`} key={stage.id}>
          <div className="stage-head"><span className="stage-index">{String(index + 1).padStart(2, "0")}</span><Icon size={18}/><span className="stage-status">{statusLabel[stage.status]}</span></div>
          <h2>{stage.label}</h2><p>{stage.detail}</p>
          <div className="stage-meta">{stage.durationMs != null && <span><Clock3 size={12}/>{(stage.durationMs / 1000).toFixed(2)}s</span>}{stage.completedAt && <span>{new Date(stage.completedAt).toLocaleString()}</span>}</div>
          {stage.artifacts.length > 0 && <div className="artifact-list">{stage.artifacts.slice(0, 3).map((artifact) => <code key={artifact}>{artifact}</code>)}</div>}
          {action && stage.status !== "pass" && <button className="stage-action" disabled={running} onClick={() => runStage(stage.id)}>{action === "sim" ? <Play size={13}/> : action === "upload" ? <Upload size={13}/> : <Zap size={13}/>} {action === "sim" ? "Run simulation" : action === "detect" ? "Detect JTAG" : action === "upload" ? "Upload SRAM" : action === "lint" ? "Run lint" : "Run build"}</button>}
          {stage.id === "hardware" && <div className="hardware-evidence"><label>Observed behavior<input value={evidenceNote} maxLength={500} onChange={(event) => setEvidenceNote(event.target.value)} placeholder="Example: LED blinks and UART replies PONG"/></label>{evidenceError && <small>{evidenceError}</small>}<div><button disabled={recording || evidenceNote.trim().length < 4} onClick={() => void recordEvidence(true)}><CheckCircle2 size={12}/> Confirm pass</button><button disabled={recording || evidenceNote.trim().length < 4} onClick={() => void recordEvidence(false)}><XCircle size={12}/> Record issue</button></div></div>}
        </article>;
      })}</div>
      <div className="verification-footnote"><ShieldCheck size={16}/><span><strong>Hardware truth:</strong> a successful JTAG scan proves the link, and a successful upload proves programming. Neither automatically proves that LEDs, UART, or external I/O behave as intended.</span></div>
    </>}
  </section>;
}
