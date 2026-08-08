# Tang FPGA Studio 2.1 — Design Intelligence

Tang FPGA Studio 2.1 connects RTL understanding, implementation evidence, and
hardware truth in one local-first workflow. It is a compatible upgrade: current
projects, `fpga.config.psd1`, the `fpga.ps1` commands, and all seven Tang board
profiles continue to work unchanged.

## Highlights

- **RTL Analysis & Architecture** — provable HDL findings with stable codes,
  explanations, fixes, source locations, module hierarchy, instances, and
  clock/reset domains.
- **Verification Center** — honest `PASS`, `FAIL`, `WARNING`, and `NOT RUN`
  stages based on current sources, real artifacts, and recorded command history.
- **Timing intelligence** — every constrained clock, achieved frequency, slack,
  and up to eight real place-and-route critical paths.
- **Resource intelligence** — every utilization class emitted by nextpnr,
  including LUT, FF, block RAM, DSP, I/O, clock buffers, and PLL resources.
- **Hardware evidence** — an explicit observed result can be recorded against
  the current source and bitstream; later changes make it stale automatically.
- **Refined UX** — dedicated Analyze and Verify navigation, responsive laptop
  layouts, accessible dark/light states, loading skeletons, clear empty/error
  recovery, and smarter recommended actions.

## What the statuses mean

| Status | Meaning |
|---|---|
| `PASS` | The stage ran successfully and its evidence is current. |
| `FAIL` | A real finding, tool run, timing result, or observed behavior failed. |
| `WARNING` | Evidence exists but is incomplete, unconstrained, or stale. |
| `NOT RUN` | No evidence exists; the Studio does not substitute a guess. |

A JTAG pass confirms communication with the programming chain. An SRAM/flash
pass confirms that programming completed. Neither is reported as proof that the
design behaves correctly; that final stage requires the behavior observed on
the board to be recorded.

## Upgrade

Installed users can download the v2.1.0 one-file Windows installer. Contributors
can update the repository, run `npm install` in `studio`, then use
`npm run desktop`. The pinned OSS CAD Suite and existing project folders do not
need to be reinstalled or migrated.

## Windows artifact

- NSIS installer: `Tang FPGA Studio_2.1.0_x64-setup.exe`
- Size: 2,524,673 bytes
- SHA-256: `673A60FA2127BA381AC6EDAF8DD1B0AD299244F4FCD161C6F725A2C996C92676`
- Packaged headless smoke test: passed

The artifact is not Authenticode-signed by a trusted commercial Windows
publisher, so Windows can display **Unknown publisher**. Verify the SHA-256
before running a downloaded copy.

## Scope boundary

The live analyzer intentionally avoids claims it cannot support reliably. It
does not replace Verilator, Icarus, Yosys, nextpnr, formal verification, or a
specialist CDC tool. See [CHANGELOG.md](../CHANGELOG.md) for the exact additions,
fixes, verification results, and known limitations.
