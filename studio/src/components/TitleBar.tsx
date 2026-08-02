import { Box, ChevronDown, Command, Cpu, Moon, PanelBottom, PanelLeft, Search, Sun } from "lucide-react";
import { useWorkbench } from "../store/workbench";

export function TitleBar(): React.JSX.Element {
  const { project, theme, setTheme, toggleSidebar, toggleBottom } = useWorkbench();
  const toggleTheme = () => setTheme(theme === "light" ? "dark" : "light");
  return (
    <header className="titlebar">
      <div className="brand-mark" aria-label="FPGA Studio"><Cpu size={18} /><span>FPGA Studio</span><span className="version-chip">v2 preview</span></div>
      <nav className="menu-strip" aria-label="Application menu">
        <button>File</button><button>Edit</button><button>Project</button><button>Build</button><button>Hardware</button><button>Help</button>
      </nav>
      <button className="command-search" title="Open command center">
        <Search size={14} /><span>{project || "Open a workspace"}</span><kbd>Ctrl K</kbd><ChevronDown size={13} />
      </button>
      <div className="window-tools">
        <button className="icon-button" onClick={toggleSidebar} title="Toggle sidebar"><PanelLeft size={16} /></button>
        <button className="icon-button" onClick={toggleBottom} title="Toggle panel"><PanelBottom size={16} /></button>
        <button className="icon-button" onClick={toggleTheme} title="Toggle color theme">{theme === "light" ? <Moon size={16} /> : <Sun size={16} />}</button>
        <button className="icon-button" title="Commands"><Command size={16} /></button>
        <button className="avatar" title="Local workspace"><Box size={14} /></button>
      </div>
    </header>
  );
}
