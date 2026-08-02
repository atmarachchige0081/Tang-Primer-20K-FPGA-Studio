# FPGA Studio v2 delivery roadmap

Each milestone must end with passing formatting, static checks, automated tests, documentation updates, and a reviewable commit.

## Milestone 1 — foundations

- Architecture, trust boundaries, migration contract, performance budgets.
- React/TypeScript/Tauri shell and typed native bridge.
- Theme tokens, accessible layout, error boundary, and browser mock mode.

Acceptance: production frontend build, Rust formatting/checks, and UI smoke tests pass.

## Milestone 2 — workspace and project system

- Project wizard, templates, recent projects, explorer, editor tabs, save state.
- Board manifests, constraints, project metadata, backups, and dependency view.
- Problems, output, terminal, source-control summary, and symbol outline.

Acceptance: create/open/edit/save/restore workflows pass without paths escaping the workspace.

## Milestone 3 — implementation and analysis

- One-click lint, simulate, synthesize, place/route, pack, SRAM upload, and flash.
- Streaming console, cancellation, diagnostics, build history/comparison.
- Timing/resource dashboards, netlist graph, and waveform viewer.

Acceptance: example projects pass lint/simulation/build; parsers pass fixture tests; failures produce actionable diagnostics.

## Milestone 4 — hardware and reusable design

- Programmer and serial discovery, device diagnostics, safe programming UI.
- Multi-session UART terminal with presets, filtering, and export.
- IP catalog, board packages, examples, simulations, and documentation.

Acceptance: read-only hardware detection is resilient with zero, one, or many devices; supported hardware smoke tests are documented.

## Milestone 5 — extension and release hardening

- Declarative plugins, optional consent-driven AI assistance, onboarding, and lessons.
- Packaging, upgrade/uninstall validation, security checks, CI, performance checks, and installer automation.

Acceptance: signed release candidate artifacts, clean-machine installation test, rollback plan, and updated user/developer documentation.

