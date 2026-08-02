const extensionLanguages: Record<string, string> = {
  v: "verilog",
  sv: "systemverilog",
  vh: "verilog",
  svh: "systemverilog",
  cst: "plaintext",
  sdc: "plaintext",
  json: "json",
  jsonc: "json",
  md: "markdown",
  ps1: "powershell",
  py: "python",
  rs: "rust",
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  css: "css",
  html: "html",
  sh: "shell",
  bat: "bat",
  toml: "ini",
  yml: "yaml",
  yaml: "yaml",
};

export function languageForPath(path: string): string {
  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  return extensionLanguages[extension] ?? "plaintext";
}

export function fileName(path: string): string {
  return path.replaceAll("\\", "/").split("/").pop() ?? path;
}
