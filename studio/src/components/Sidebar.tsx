import { useState } from "react";
import { ChevronDown, ChevronRight, CirclePlus, FileCode2, Folder, FolderOpen, MoreHorizontal, RefreshCw, Sparkles } from "lucide-react";
import { bridge } from "../lib/bridge";
import { fileName, languageForPath } from "../lib/language";
import { useWorkbench } from "../store/workbench";
import type { ProjectNode } from "../types";

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

export function Sidebar(): React.JSX.Element {
  const activity = useWorkbench((state) => state.activity);
  const panels: Record<typeof activity, React.JSX.Element> = {
    explorer: <Explorer />,
    search: <Placeholder title="SEARCH" text="Search signals, modules, constraints, and project text." action="Search workspace" />,
    source: <Placeholder title="SOURCE CONTROL" text="Your Git changes and branch status appear here." action="Refresh repository" />,
    hardware: <Placeholder title="HARDWARE" text="Programmers, boards, and serial connections are managed here." action="Scan devices" />,
    ip: <Placeholder title="IP LIBRARY" text="Verified reusable UART, SPI, PWM, FIFO, memory, and DSP blocks." action="Browse catalog" />,
    extensions: <Placeholder title="EXTENSIONS" text="Install declarative board, IP, simulator, and analysis providers." action="Open registry" />,
  };
  return <aside className="sidebar">{panels[activity]}</aside>;
}
