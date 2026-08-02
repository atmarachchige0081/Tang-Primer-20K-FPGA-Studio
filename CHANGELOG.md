# Changelog

All notable user-facing changes are recorded here.

## 2.0.1 — 2026-08-02

- Kept packaged SPI teaching signals warning-free under the GitHub runner's
  Verilator version while preserving the verified `0xA5` loopback behavior.
- Split companion and native CI responsibilities so each clean job installs
  only the dependencies it executes, and enforced canonical Rust formatting.

## 2.0.0 — 2026-08-02

### Added

- Added validated packages for Tang Nano 1K, 4K, 9K, and 20K plus Tang Primer
  20K Dock, Core, and Lite variants, including installed OSS CAD Suite family
  mappings and all openFPGALoader board aliases.
- Added a friendly UART command-console project with case-insensitive `HELP`,
  `PING`, `LED ON`, `LED OFF`, `STATUS`, and `ABOUT` commands, complete replies,
  a self-checking terminal model, waveform layout, and synthesized bitstream.
- Added real read-only Git status and declarative plugin/provider discovery to
  the native Studio, plus bundled board and HDL-pattern providers.
- Added a laptop-safe parallel board-family build smoke test and a repeatable
  frontend/backend/concurrency stress runner.
- Added real File, Edit, Project, Build, Hardware, and Help menus plus a
  keyboard-navigable `Ctrl+K` action center with a context-aware next step.
- Added native startup panic logging and a visible recovery dialog under
  `%LOCALAPPDATA%\Tang FPGA Studio\logs\crash.log`.

### Changed

- New Project now filters board choices by template compatibility and writes
  project-specific device, family, constraints, clock, and programmer settings.
- Hardware Manager uses the active board manifest and limits automatic Zadig
  repair to the known Primer Dock `0403:6010` Interface 0 layout.
- UART Terminal includes clickable beginner command presets, while the HDL
  pattern panel now waits for workspace discovery and offers visible retry.
- Backend FPGA jobs now enforce one writer per project so independent UI views
  cannot corrupt a shared build directory.
- Native filesystem, Git, board, plugin, HDL, waveform, netlist, and serial
  operations now run off the UI thread. Output, waveform, and netlist rendering
  are bounded to keep large designs responsive.
- Gowin bitstreams are packed without the optional compression mode that is
  mis-parsed by the pinned openFPGALoader, then structurally validated before
  programming. JTAG programming has a 90-second watchdog and specific recovery
  guidance for a reset FTDI endpoint.

### Verified

- Native frontend production build and 17 Vitest checks; 22 Rust parser,
  security, package, and concurrency checks; UART lint, protocol simulation,
  Primer place/route/packing at 27 MHz; and parallel full bitstream builds for
  all five distinct Tang FPGA device families.
- Live Primer 20K Dock acceptance passed on Windows: JTAG ID `0x81b`, validated
  uncompressed SRAM upload to 100%, and a 115200-baud COM15 `PING`/`PONG` UART
  round trip from the programmed FPGA.

## 1.2.0 — 2026-07-27

### Added

- Added a root-level, literal-beginner `INSTALL.md` covering each Windows
  prerequisite through a first safe SRAM upload, with automated sequence,
  link, repository URL, and hardware-safety checks.
- Replaced the folder-name prompt with a safe New Project Wizard offering
  complete board-I/O and UART starting points plus an optional guided tutorial.
- Added HDL symbol navigation for modules, ports, signals, and instances,
  project-wide exact references, and named-port module-instantiation generation.
- Added a dependency-free integrated Windows UART terminal with COM-port
  discovery, transmit and receive, ASCII/hex views, timestamps, line endings,
  history, connection recovery, and UTF-8 log saving.
- Added a Verification Center for selecting testbenches and GTKWave layouts,
  running simulation/debug, and summarizing PASS/FAIL assertion lines.
- Added guided board/JTAG/UART/driver setup and an interactive six-step first
  FPGA workflow that persists progress per project.
- Added clickable Verilator/Icarus-style console locations and selection-safe
  PowerShell support for `-Testbench`, `-TestbenchTop`, and `-WaveLayout`.
- Added a complete UART greeting/echo learning project with RX, TX, physical
  UART constraints, waveform layout, documentation, and protocol-level tests.
- Added a separate synthesized-netlist viewer with searchable components,
  categorized overview, local fan-in/fan-out, named nets, zoom/pan controls,
  large-design limits, and source navigation from Yosys cell metadata.
- Added versioned first-launch release notes that appear once per release and
  remain available from Help and the command palette.
- Added a release-driven installer notification workflow with a secure
  token-free polling fallback in the one-file installer repository.

### Changed

- Refined both themes into calmer, more natural professional palettes and
  replaced mechanical labels with clearer human language and workflow groups.
- Expanded CI and local release gates to validate the maintained UART project
  and retheme nine open feature dialogs across 30 live theme changes.

### Verified

- 33 Python tests, dark/light startup, theme rollback and contrast checks,
  Verilator lint, a 30-byte bidirectional UART simulation, and Tang Primer 20K
  synthesis/place/route/packing at 27 MHz (345.90 MHz reported maximum).

## 1.1.0 — 2026-07-26

### Added

- Added a complete accessible light theme alongside the refined dark theme,
  with a header control, View menu, `Ctrl+Alt+T` shortcut, startup override,
  and locally remembered preference.
- Added semantic color tokens, theme-aware custom icon regeneration, live
  retheming for open editors/dialogs/menus/canvases, and safe rollback when a
  platform-specific UI operation fails.
- Expanded the HDL Pattern Library from six snippets to 72 categorized,
  searchable references with difficulty, scope, explanations, code copying,
  editor insertion, and completion aliases.
- Added automated validation for library size, metadata, aliases, filtering,
  and separation of synthesizable RTL from testbench-only constructs.
- Added WCAG contrast validation, dark/light startup smoke tests, a 30-cycle
  live-switch stress test with dialogs open, state/icon checks, and injected
  failure recovery verification.

### Verified

- Complete release gate across Python, PowerShell, project intelligence,
  Verilator lint, self-checking Icarus simulation, both UI themes, and
  reproducible dark/light screenshots.

## 1.0.0 — 2026-07-26

### Added

- Premium, DPI-aware desktop workspace with custom iconography, searchable
  explorer, open-file tabs, editor breadcrumbs, bracket matching, tooltips,
  and grouped Create/Verify/Implement actions.
- Command palette, project-wide search, HDL Pattern Library, contextual HDL
  explanation, pin assignment inspector, safe quick fixes, and generated
  testbench skeletons.
- Module, port, signal, parameter, and instance indexing with hierarchy,
  constraint, electrical-standard, duplicate-pin, recursion, case-completeness,
  synthesis, and simulation diagnostics.
- Project health, workflow readiness, module hierarchy, Fmax, resource use,
  artifact status, session history, and live command timing.
- Rotating crash/diagnostic logs, remembered project selection, hardware-action
  validation, and safer interruption of programming commands.
- Reproducible screenshots, CI quality gates, release checks, security policy,
  contribution guide, code of conduct, and MIT license.

### Verified

- Tang Primer 20K Project 01 Verilator lint, self-checking Icarus simulation,
  nextpnr timing data, and open-source bitstream workflow.

## 0.1.0-beta — 2026-07-26

- Initial dependency-free desktop UI for the repository's verified PowerShell
  simulation, waveform, build, upload, flash, JTAG, UART, and diagnosis flow.
