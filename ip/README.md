# FPGA Studio IP and HDL pattern library

`catalog.json` is the packaged, language-neutral catalog used by FPGA Studio v2. Its source of truth is the reviewed `ide/hdl_patterns.py` library.

After changing the source catalog, regenerate this file from the repository root:

```powershell
python scripts/export-hdl-patterns.py
```

Every entry includes its learning level, category, aliases, synthesizability, explanation, and insertion-ready SystemVerilog.
