import { useEffect, useState } from "react";
import { ArrowLeft, ChevronDown, ChevronRight, CirclePlus, FileCode2, Folder, FolderOpen, MoreHorizontal, RefreshCw, Search, Sparkles } from "lucide-react";
import { bridge } from "../lib/bridge";
import { fileName, languageForPath } from "../lib/language";
import { useWorkbench } from "../store/workbench";
import type { HdlPattern, ProjectNode } from "../types";

function TreeNode({ node, depth = 0 }: { node: ProjectNode; depth?: number }): React.JSX.Element {
  const [expanded, setExpanded] = useState(depth < 1);
  const { root, openFile, appendOutput } = useWorkbench();
  const activate = async () => {
    if (node.kind === "directory") return setExpanded((value) => !value);
    try {
      const content = await bridge.readText(root, node.path);
      openFile({ path: node.path, name: fileName(node.path), language: languageForPath(node.path), content, savedContent: content });
    } catch (error) {
      appendOutput({ jobId: "editor", phase: "open", stream: "stderr", message: error instanceof Error ? error.message : String(error), timestamp: new Date().toISOString() });
    }
  };
  return (
    <div>
      <button className="tree-row" style={{ paddingLeft: `${8 + depth * 14}px` }} onClick={() => void activate()} title={node.path}>
        {node.kind === "directory" ? (expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />) : <span className="tree-indent" />}
        {node.kind === "directory" ? (expanded ? <FolderOpen size={15} className="folder-icon" /> : <Folder size={15} className="folder-icon" />) : <FileCode2 size={14} className={node.name.endsWith(".sv") ? "hdl-icon" : "file-icon"} />}
        <span>{node.name}</span>
      </button>
      {expanded && node.children?.map((child) => <TreeNode node={child} depth={depth + 1} key={child.path} />)}
    </div>
  );
}

function Explorer(): React.JSX.Element {
  const { project, tree } = useWorkbench();
  return <>
    <div className="sidebar-heading"><span>EXPLORER</span><div><button title="New file"><CirclePlus size={14} /></button><button title="Refresh"><RefreshCw size={14} /></button><button title="More"><MoreHorizontal size={14} /></button></div></div>
    <div className="project-heading"><ChevronDown size={13} /><strong>{project.toUpperCase()}</strong></div>
    <div className="tree-scroll">{tree.map((node) => <TreeNode node={node} key={node.path} />)}</div>
    <div className="outline-section"><ChevronRight size={13} /><strong>OUTLINE</strong><span>5 symbols</span></div>
    <div className="outline-section"><ChevronRight size={13} /><strong>DEPENDENCIES</strong><span>healthy</span></div>
  </>;
}

function Placeholder({ title, text, action }: { title: string; text: string; action: string }): React.JSX.Element {
  return <div className="sidebar-placeholder"><div className="sidebar-heading"><span>{title}</span></div><Sparkles size={28} /><p>{text}</p><button className="secondary-button">{action}</button></div>;
}

function IpLibrary(): React.JSX.Element {
  const { root, tabs, activePath, updateFile, setView, appendOutput } = useWorkbench();
  const [patterns, setPatterns] = useState<HdlPattern[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<HdlPattern | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { void bridge.hdlPatterns(root).then(setPatterns).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : String(reason))); }, [root]);
  const active = tabs.find((tab) => tab.path === activePath);
  const matches = patterns.filter((pattern) => `${pattern.title} ${pattern.summary} ${pattern.category} ${pattern.aliases.join(" ")}`.toLowerCase().includes(query.toLowerCase())).slice(0, 72);
  const insert = () => {
    if (!selected || !active) return;
    const separator = active.content.endsWith("\n") ? "\n" : "\n\n";
    updateFile(active.path, `${active.content}${separator}// ${selected.title}\n${selected.code}\n`);
    setView("editor");
    appendOutput({ jobId: "ip-library", phase: "insert", stream: "system", message: `Inserted '${selected.title}' into ${active.path}. Review signal names, then lint and simulate.`, timestamp: new Date().toISOString() });
  };
  if (selected) return <div className="ip-library"><div className="sidebar-heading"><button className="ip-back" onClick={() => setSelected(null)}><ArrowLeft size={14}/> Catalog</button></div><div className="ip-detail"><span className="ip-meta">{selected.category} · {selected.difficulty}</span><h3>{selected.title}</h3><p>{selected.summary}</p><div className="ip-badges"><span>{selected.synthesizable ? "Synthesizable RTL" : "Simulation only"}</span>{selected.aliases.map((alias) => <code key={alias}>{alias}</code>)}</div><pre><code>{selected.code}</code></pre><button className="primary-button" disabled={!active} onClick={insert}><FileCode2 size={14}/> {active ? `Insert into ${active.name}` : "Open an HDL file to insert"}</button><small>Patterns are learning references. Rename signals and add project-specific reset/clock handling before use.</small></div></div>;
  return <div className="ip-library"><div className="sidebar-heading"><span>HDL PATTERN LIBRARY</span><strong>{patterns.length}</strong></div><label className="ip-search"><Search size={14}/><input aria-label="Search HDL patterns" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="FIFO, CDC, assertion…" /></label>{error ? <div className="empty-small">{error}</div> : <div className="ip-list">{matches.map((pattern) => <button key={pattern.title} onClick={() => setSelected(pattern)}><span><strong>{pattern.title}</strong><small>{pattern.category} · {pattern.difficulty}</small></span><ChevronRight size={13}/></button>)}</div>}<div className="ip-footer">{matches.length} matches · reviewed local examples</div></div>;
}

export function Sidebar(): React.JSX.Element {
  const activity = useWorkbench((state) => state.activity);
  const panels: Record<typeof activity, React.JSX.Element> = {
    explorer: <Explorer />,
    search: <Placeholder title="SEARCH" text="Search signals, modules, constraints, and project text." action="Search workspace" />,
    source: <Placeholder title="SOURCE CONTROL" text="Your Git changes and branch status appear here." action="Refresh repository" />,
    hardware: <Placeholder title="HARDWARE" text="Programmers, boards, and serial connections are managed here." action="Scan devices" />,
    ip: <IpLibrary />,
    extensions: <Placeholder title="EXTENSIONS" text="Install declarative board, IP, simulator, and analysis providers." action="Open registry" />,
  };
  return <aside className="sidebar">{panels[activity]}</aside>;
}
