# v1 to v2 migration plan

## What stays stable

- Every current `fpga.ps1` command and parameter.
- Existing Tang Primer 20K projects, constraints, simulations, and bitstreams.
- The Python/Tk application as a temporary fallback while v2 is validated.
- The existing release and one-file installer repositories until v2 packaging passes acceptance tests.

## Capability mapping

| v1 capability | v2 destination | Migration strategy |
| --- | --- | --- |
| Project selection and examples | Workspace explorer and project wizard | Read existing layout; add optional manifest |
| Text editing | Monaco editor | Native guarded file commands |
| Build, debug, upload, flash | Build center | Wrap the existing CLI and stream progress |
| Timing and utilization cards | Intelligence dashboard | Reuse reports with typed parsers and history |
| GTKWave | Integrated waveform plus external GTKWave action | Preserve one-command external viewer |
| Netlist popup | Interactive netlist panel | Keep generated assets; add graph navigation |
| UART terminal | Multi-session terminal | Rust-owned serial sessions; CLI remains fallback |
| Themes and release notes | Settings and welcome experience | Token-driven accessible light/dark themes |

## Rollout

1. Ship the v2 shell on a development branch while v1 remains the default launcher.
2. Validate project open/save, CLI invocation, and error recovery on real existing projects.
3. Enable the v2 launcher for preview builds and gather crash/performance data locally.
4. Make v2 the default only after installer, upgrade, simulation, build, and hardware detection acceptance tests pass.
5. Retain an explicit legacy launcher for one stable release and document removal criteria.

No project migration is destructive. Optional v2 metadata is additive, and backups are created before an automated format upgrade.

