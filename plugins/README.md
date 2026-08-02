# FPGA Studio plugins

v2 plugins are declarative manifests. A plugin can contribute board data, IP
metadata, simulator adapters, analysis parsers, or a sandboxed panel. It cannot
load a native DLL or execute an arbitrary command. Every requested capability
is shown before enablement and is enforced by the Rust host.

This intentionally conservative v2 boundary allows the extension system to
grow without turning community manifests into an unrestricted shell.

