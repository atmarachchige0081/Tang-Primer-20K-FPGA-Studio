import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, Code2, FileCode2, GitBranch, Layers3, RefreshCw, Search, Waypoints, XCircle } from "lucide-react";
import { bridge } from "../lib/bridge";
import { useWorkbench } from "../store/workbench";
import type { Diagnostic, HdlIndex } from "../types";

type FindingFilter = "all" | "error" | "warning";

export function AnalysisView(): React.JSX.Element {
  const root = useWorkbench((state) => state.root);
  const project = useWorkbench((state) => state.projectPath);
  const setDiagnostics = useWorkbench((state) => state.setDiagnostics);
  const openFile = useWorkbench((state) => state.openFile);
  const [index, setIndex] = useState<HdlIndex | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FindingFilter>("all");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    if (!root) return;
    setLoading(true);
    setError(null);
    try {
      const result = await bridge.hdlIndex(root, project);
      setIndex(result);
      setDiagnostics(result.diagnostics);
    } catch (reason) {
      setIndex(null);
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setLoading(false);
    }
  }, [root, project, setDiagnostics]);

  useEffect(() => {
    void load();
    const refresh = () => void load();
    window.addEventListener("fpga-studio:analysis-refresh", refresh);
    return () => window.removeEventListener("fpga-studio:analysis-refresh", refresh);
  }, [load]);

  const findings = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (index?.diagnostics ?? []).filter((finding) => {
      if (filter !== "all" && finding.severity !== filter) return false;
      return !needle || `${finding.code} ${finding.message} ${finding.file} ${finding.suggestion}`.toLowerCase().includes(needle);
    });
  }, [index, filter, query]);
  const errors = index?.diagnostics.filter((finding) => finding.severity === "error").length ?? 0;
  const warnings = index?.diagnostics.filter((finding) => finding.severity === "warning").length ?? 0;

  const jumpTo = async (finding: Diagnostic) => {
    if (!finding.file || !/\.(?:v|sv|vh|svh)$/i.test(finding.file)) return;
    try {
      const content = await bridge.readText(root, finding.file);
      openFile({ path: finding.file, name: finding.file.split("/").at(-1) ?? finding.file, language: finding.file.endsWith(".sv") ? "systemverilog" : "verilog", content, savedContent: content });
    } catch {
      // The finding remains useful even when its source was removed between scan and navigation.
    }
  };

  if (loading) return <section className="feature-view"><div className="feature-header"><div><p className="eyebrow">Design intelligence</p><h1>Analyzing RTL architecture</h1><p>Indexing modules, clock domains, and provable design findings.</p></div></div><div className="analysis-skeleton"><span/><span/><span/></div></section>;
  if (error) return <section className="feature-view"><div className="view-state error-state"><XCircle size={26}/><strong>HDL analysis could not complete</strong><p>{error}</p><button className="primary-button" onClick={() => void load()}><RefreshCw size={14}/> Retry analysis</button></div></section>;

  return <section className="feature-view analysis-view">
    <div className="feature-header"><div><p className="eyebrow">Design intelligence</p><h1>RTL analysis & architecture</h1><p>Conservative findings from current sources—separate from the full Verilator lint pass.</p></div><button className="secondary-button" onClick={() => void load()}><RefreshCw size={15}/> Analyze current files</button></div>
    <div className="analysis-overview">
      <article><FileCode2 size={18}/><span>Files</span><strong>{index?.files.length ?? 0}</strong></article>
      <article><Layers3 size={18}/><span>Modules</span><strong>{index?.modules.length ?? 0}</strong></article>
      <article><Waypoints size={18}/><span>Instances</span><strong>{index?.instances.length ?? 0}</strong></article>
      <article><Clock3 size={18}/><span>Clock domains</span><strong>{index?.clockDomains.length ?? 0}</strong></article>
      <article className={errors ? "danger" : "healthy"}>{errors ? <XCircle size={18}/> : <CheckCircle2 size={18}/>}<span>Blocking</span><strong>{errors}</strong></article>
      <article className={warnings ? "warning" : "healthy"}><AlertTriangle size={18}/><span>Warnings</span><strong>{warnings}</strong></article>
    </div>

    <div className="analysis-layout">
      <article className="panel-card findings-panel">
        <div className="card-title"><div><h2>Actionable findings</h2><p>Each result includes the exact reason and a safe next step.</p></div><span className={errors ? "status-warn" : "status-good"}>{errors ? `${errors} blocking` : "No blocking findings"}</span></div>
        <div className="analysis-tools"><label className="inline-search"><Search size={14}/><input aria-label="Search HDL findings" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search code, file, or message"/></label><div className="segmented-control">{(["all", "error", "warning"] as const).map((item) => <button className={filter === item ? "active" : ""} key={item} onClick={() => setFilter(item)}>{item}</button>)}</div></div>
        <div className="finding-list">{findings.length ? findings.map((finding, position) => <button className={`finding-card ${finding.severity}`} onClick={() => void jumpTo(finding)} key={`${finding.code}-${finding.file}-${finding.line}-${position}`}>
          <span className="finding-icon">{finding.severity === "error" ? <XCircle size={17}/> : <AlertTriangle size={17}/>}</span>
          <span className="finding-copy"><span><code>{finding.code ?? "HDL"}</code>{finding.file && <small>{finding.file}{finding.line ? `:${finding.line}` : ""}</small>}</span><strong>{finding.message}</strong>{finding.suggestion && <em>{finding.suggestion}</em>}</span>
        </button>) : <div className="analysis-clean"><CheckCircle2 size={28}/><strong>Current RTL scan is clean</strong><p>No provable issues were found. Run Lint and Simulate for deeper toolchain verification.</p></div>}</div>
      </article>

      <div className="architecture-stack">
        <article className="panel-card architecture-card"><div className="card-title"><div><h2>Module hierarchy</h2><p>Top: <code>{index?.top}</code></p></div><GitBranch size={18}/></div><div className="module-list">{index?.modules.map((module) => {
          const children = index.instances.filter((instance) => instance.parentModule === module.name);
          return <div className={`module-row ${module.name === index.top ? "top" : ""}`} key={`${module.file}:${module.name}`}><div><Code2 size={15}/><span><strong>{module.name}</strong><small>{module.file}:{module.line} · {module.ports.length} ports</small></span>{module.name === index.top && <em>TOP</em>}</div>{children.map((child) => <div className="instance-row" key={`${child.instanceName}:${child.line}`}><GitBranch size={13}/><code>{child.instanceName}</code><span>{child.moduleName}</span><small>line {child.line}</small></div>)}</div>;
        })}{!index?.modules.length && <div className="empty-small">No module declarations were indexed.</div>}</div></article>
        <article className="panel-card architecture-card"><div className="card-title"><div><h2>Clock & reset map</h2><p>Sequential sensitivity domains detected in RTL.</p></div><Clock3 size={18}/></div><div className="clock-domain-list">{index?.clockDomains.map((domain, position) => <div className="clock-domain" key={`${domain.moduleName}:${domain.clock}:${position}`}><span className="clock-pulse"/><div><strong>{domain.clock}</strong><small>{domain.edge} · {domain.moduleName}</small></div><code>{domain.reset ? `reset ${domain.reset}` : "no async reset"}</code></div>)}{!index?.clockDomains.length && <div className="empty-small">No edge-sensitive clock domains were detected.</div>}</div></article>
      </div>
    </div>
  </section>;
}
