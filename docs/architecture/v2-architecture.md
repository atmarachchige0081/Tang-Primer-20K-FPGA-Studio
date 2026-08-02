# FPGA Studio v2 architecture

FPGA Studio v2 is a local-first desktop application for learning, building, simulating, and programming FPGA projects. The v2 UI is React and TypeScript; the native host is Tauri 2 and Rust. Existing projects and the `fpga.ps1` command line remain first-class and compatible.

## System shape

```text
React workspace (untrusted webview)
  editor | explorer | problems | console | dashboard | waveform | hardware
                         |
              narrow typed Tauri commands
                         |
Rust desktop host (trusted boundary)
  path guard | process runner | project index | parsers | serial manager
                         |
Compatibility core: fpga.ps1 + OSS CAD Suite
  Verilator | Icarus | Yosys | nextpnr | gowin_pack | openFPGALoader
```

The React application never receives a general shell, filesystem, or process API. Every native operation is an explicit Rust command. Paths are canonicalized and must remain below the selected workspace. Long-running jobs are owned by a job manager and stream typed events to the UI. Programming flash always requires an explicit confirmation in the UI.

## Main packages

| Package | Responsibility |
| --- | --- |
| `studio/src` | React workspace, Monaco editor, panels, state, charts, and accessible themes |
| `studio/src-tauri` | Native commands, path security, job execution, serial sessions, and parsers |
| `fpga.ps1` | Stable CLI contract for toolchain, simulation, build, programming, and diagnostics |
| `boards` | Data-driven board manifests, constraints, examples, and programming metadata |
| `ip` | Versioned reusable HDL blocks with documentation and verification assets |
| `plugins` | Declarative extension manifests; v2 does not execute arbitrary third-party native code |

## Data and execution flow

1. The user opens a workspace or creates a project from a template.
2. Rust validates the path and returns a serializable project tree.
3. Editing stays in the webview until an explicit save invokes an atomic native write.
4. Build actions launch `powershell -NoProfile -File fpga.ps1` with an allow-listed action and project path.
5. Output is streamed to the console and converted into structured diagnostics.
6. Completed jobs are stored in `.fpga-studio/history.json`; generated tool files stay under `build/`.
7. Timing and utilization reports feed the dashboard and comparison views.

## Security boundaries

- No remote content is loaded in the desktop window.
- Tauri capabilities expose only core window/event functionality; project operations use audited commands.
- Native process arguments are constructed from enums, not concatenated shell strings.
- Reads and writes reject traversal, symlinks escaping the workspace, device paths, and unsupported file types.
- Project creation refuses destructive overwrite. Backup and restore use versioned archives.
- AI is optional, disabled by default, and cannot transmit source files without a per-request preview and consent.
- Plugins are JSON manifests with a versioned schema and declared capabilities.

## Performance budgets

| Measurement | Target on a typical developer laptop |
| --- | --- |
| First useful window | under 2.5 seconds |
| Warm project reopen | under 1 second after window creation |
| Input response | under 50 ms |
| Project tree refresh | under 500 ms for 10,000 files |
| Dashboard parse | under 250 ms for normal reports |
| Waveform initial view | progressive; first signals under 1 second |

Large reports and waveform parsing run outside the UI thread. File trees are lazy and cached. Log views virtualize output and keep a bounded in-memory history.

## Compatibility contract

The CLI remains usable without the desktop application. Existing `fpga.config.psd1`, `rtl/`, `sim/`, `constraints/`, and `build/` layouts remain valid. v2 adds metadata but does not require it to build an existing project. A browser-mode UI with a mock native adapter is kept for component development and automated tests.

