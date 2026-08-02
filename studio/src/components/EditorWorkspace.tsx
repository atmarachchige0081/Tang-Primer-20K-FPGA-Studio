import Editor, { type BeforeMount } from "@monaco-editor/react";
import { CircleX, Code2, GitCompareArrows, X } from "lucide-react";
import { useWorkbench } from "../store/workbench";

const configureMonaco: BeforeMount = (monaco) => {
  for (const id of ["verilog", "systemverilog"]) {
    if (!monaco.languages.getLanguages().some((language: { id: string }) => language.id === id)) monaco.languages.register({ id });
    monaco.languages.setMonarchTokensProvider(id, {
      keywords: ["module", "endmodule", "input", "output", "inout", "logic", "wire", "reg", "always", "always_ff", "always_comb", "assign", "begin", "end", "if", "else", "case", "endcase", "posedge", "negedge", "parameter", "localparam", "generate", "endgenerate", "for", "integer"],
      tokenizer: { root: [[/\/\/.*$/, "comment"], [/\/\*/, "comment", "@comment"], [/[a-zA-Z_$][\w$]*/, { cases: { "@keywords": "keyword", "@default": "identifier" } }], [/\d+'[bdho][0-9a-fA-F_xzXZ]+/, "number"], [/\d+/, "number"], [/".*?"/, "string"], [/[{}()[\]]/, "@brackets"], [/[;,.]/, "delimiter"]], comment: [[/[^/*]+/, "comment"], [/\*\//, "comment", "@pop"], [/[/*]/, "comment"]] },
    });
    monaco.languages.setLanguageConfiguration(id, { comments: { lineComment: "//", blockComment: ["/*", "*/"] }, brackets: [["{", "}"], ["[", "]"], ["(", ")"]], autoClosingPairs: [{ open: "(", close: ")" }, { open: "[", close: "]" }, { open: "begin", close: "end" }, { open: "\"", close: "\"" }] });
  }
};

export function EditorWorkspace(): React.JSX.Element {
  const { tabs, activePath, theme, updateFile, closeFile, openFile } = useWorkbench();
  const active = tabs.find((tab) => tab.path === activePath);
  return (
    <section className="editor-workspace">
      <div className="editor-tabs" role="tablist">
        {tabs.map((tab) => <button role="tab" aria-selected={tab.path === activePath} className={tab.path === activePath ? "active" : ""} key={tab.path} onClick={() => openFile(tab)}><Code2 size={14} /><span>{tab.name}</span>{tab.content !== tab.savedContent && <span className="dirty-dot" title="Unsaved" />}<X size={13} onClick={(event) => { event.stopPropagation(); closeFile(tab.path); }} /></button>)}
      </div>
      {active ? <>
        <div className="breadcrumbs"><span>{active.path.replaceAll("/", "  ›  ")}</span><span className="breadcrumb-symbol">◇ top</span></div>
        <div className="editor-area">
          <Editor beforeMount={configureMonaco} path={active.path} language={active.language} value={active.content} theme={theme === "light" ? "light" : "vs-dark"} onChange={(value) => updateFile(active.path, value ?? "")} options={{ fontFamily: "'JetBrains Mono', 'Cascadia Code', Consolas, monospace", fontSize: 13, lineHeight: 21, minimap: { enabled: true, scale: 1 }, smoothScrolling: true, cursorSmoothCaretAnimation: "on", renderWhitespace: "selection", bracketPairColorization: { enabled: true }, guides: { bracketPairs: true, indentation: true }, padding: { top: 12 }, automaticLayout: true, formatOnPaste: true, scrollBeyondLastLine: false, wordWrap: "off" }} />
        </div>
      </> : <div className="empty-editor"><CircleX size={30} /><h2>No source file open</h2><p>Select a file from Explorer or create a module.</p><button className="secondary-button"><GitCompareArrows size={15} /> Open recent source</button></div>}
    </section>
  );
}
