# ADR 0001: Tauri shell over the existing compatibility core

- Status: accepted
- Date: 2026-08-02

## Decision

Use React/TypeScript for the workspace and Tauri 2/Rust for native integration. Keep `fpga.ps1` as the authoritative implementation of the current FPGA flow and invoke it through allow-listed Rust commands.

## Why

The current CLI is tested, scriptable, and already captures Windows and Tang Primer 20K details. Reimplementing those semantics in UI code would create two competing toolchains. Tauri provides a small desktop runtime and Rust provides a suitable boundary for filesystem validation, process lifecycle, serial I/O, and report parsing.

## Consequences

- CLI users are not forced to adopt the desktop app.
- UI and command-line behavior remain aligned.
- Rust commands must remain narrow and covered by path/argument tests.
- A later native build engine can replace individual CLI actions behind the same typed bridge without changing the UI.

