# Project templates

`catalog.json` is the declarative catalog used by FPGA Studio v2. A template
starts from a complete verified project and may apply a small overlay. Creation
is transactional: the destination must not exist, generated/build files are
excluded, and a failed copy is rolled back.

To contribute a template:

1. Put synthesizable HDL in `rtl/` and a self-checking testbench in `sim/`.
2. Use only board ports covered by the selected package constraints.
3. Add the entry to `catalog.json`; never reference a path outside this repo.
4. Run lint, simulation, and build before submitting the change.
5. Explain controls, architecture, expected waveform, and limitations in its README.

