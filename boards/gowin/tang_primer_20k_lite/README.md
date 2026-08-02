# Tang Primer 20K Lite board package

Targets the Primer 20K core on the Lite carrier. Only the core 27 MHz clock is
pre-constrained because user I/O depends on the external circuit. Programming
uses the `tangprimer20k` alias with a compatible external JTAG adapter.
