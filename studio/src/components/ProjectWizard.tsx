import { useEffect, useMemo, useState } from "react";
import { Check, CircuitBoard, FolderPlus, LoaderCircle, ShieldCheck, X } from "lucide-react";
import { bridge } from "../lib/bridge";
import { useWorkbench } from "../store/workbench";
import type { ProjectTemplate } from "../types";

const validProjectName = /^\d{2}_[a-z][a-z0-9_]*$/;

export function ProjectWizard(): React.JSX.Element | null {
  const { projectWizardOpen, closeProjectWizard, root, setWorkspace, setBuild } = useWorkbench();
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [templateId, setTemplateId] = useState("led_button");
  const [folderName, setFolderName] = useState("04_my_first_project");
  const [displayName, setDisplayName] = useState("My first FPGA project");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!projectWizardOpen || !root) return;
    let disposed = false;
    setError("");
    void bridge.projectTemplates(root).then((items) => {
      if (!disposed) {
        setTemplates(items);
        if (items[0] && !items.some((item) => item.id === templateId)) setTemplateId(items[0].id);
      }
    }).catch((reason: unknown) => { if (!disposed) setError(reason instanceof Error ? reason.message : String(reason)); });
    return () => { disposed = true; };
  }, [projectWizardOpen, root]);

  const selected = useMemo(() => templates.find((item) => item.id === templateId), [templates, templateId]);
  const nameValid = validProjectName.test(folderName);

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!nameValid || !selected || loading) return;
    setLoading(true);
    setError("");
    try {
      const snapshot = await bridge.createProject(root, folderName, templateId, displayName);
      setWorkspace(snapshot.root, snapshot.project, snapshot.projectPath, snapshot.tree);
      setBuild(await bridge.buildSummary(snapshot.root, snapshot.projectPath));
      closeProjectWizard();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setLoading(false);
    }
  };

  if (!projectWizardOpen) return null;
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !loading) closeProjectWizard(); }}>
    <section className="project-wizard" role="dialog" aria-modal="true" aria-labelledby="wizard-title">
      <header><div className="wizard-symbol"><FolderPlus size={22}/></div><div><p className="eyebrow">Verified project generator</p><h1 id="wizard-title">Create an FPGA project</h1><p>Choose a tested starting point. You can change every generated file.</p></div><button className="icon-button" onClick={closeProjectWizard} disabled={loading} aria-label="Close project wizard"><X size={17}/></button></header>
      <form onSubmit={(event) => void create(event)}>
        <div className="wizard-section-title"><span>1</span><div><strong>Choose a template</strong><small>Each starter includes synthesizable RTL and self-checking simulation.</small></div></div>
        <div className="template-grid">
          {templates.map((template) => <button type="button" className={`template-card ${template.id === templateId ? "selected" : ""}`} key={template.id} onClick={() => setTemplateId(template.id)}>
            <span className="template-check">{template.id === templateId && <Check size={12}/>}</span><span className="template-category">{template.category}</span><strong>{template.name}</strong><p>{template.description}</p><span className="template-meta">{template.level}{template.hardwareReady ? " · hardware ready" : " · simulation first"}</span><span className="template-tags">{template.tags.map((tag) => <i key={tag}>{tag}</i>)}</span>
          </button>)}
          {!templates.length && !error && <div className="wizard-loading"><LoaderCircle className="spin" size={18}/> Loading verified templates…</div>}
        </div>
        <div className="wizard-form-grid">
          <div><div className="wizard-section-title"><span>2</span><div><strong>Name the project</strong><small>Sortable folders keep lessons and examples organized.</small></div></div><label className="field-label">Display name<input value={displayName} maxLength={80} onChange={(event) => setDisplayName(event.target.value)} placeholder="SPI sensor interface" /></label><label className="field-label">Folder name<input className={!nameValid ? "invalid" : ""} value={folderName} maxLength={60} onChange={(event) => setFolderName(event.target.value)} spellCheck={false} /><small>{nameValid ? `projects/${folderName}` : "Use 04_lowercase_words format."}</small></label></div>
          <div><div className="wizard-section-title"><span>3</span><div><strong>Confirm the target</strong><small>The board package controls device and programming settings.</small></div></div><div className="board-choice"><CircuitBoard size={27}/><div><strong>Tang Primer 20K + Dock</strong><span>GW2A-LV18PG256C8/I7 · 27 MHz</span></div><span className="status-good"><ShieldCheck size={13}/> verified</span></div><ul className="creation-list"><li><Check size={13}/> RTL, simulation, constraints, and documentation</li><li><Check size={13}/> Project manifest and CLI wrapper</li><li><Check size={13}/> No generated build files copied</li></ul></div>
        </div>
        {error && <div className="wizard-error">{error}</div>}
        <footer><span>{selected ? `Creating from ${selected.name}` : "Select a template"}</span><button type="button" className="secondary-button" onClick={closeProjectWizard} disabled={loading}>Cancel</button><button type="submit" className="primary-button" disabled={!nameValid || !selected || loading}>{loading ? <LoaderCircle className="spin" size={15}/> : <FolderPlus size={15}/>} {loading ? "Creating safely…" : "Create project"}</button></footer>
      </form>
    </section>
  </div>;
}
