# Tang Primer 20K board package

This package describes the `GW2A-LV18PG256C8/I7` core board on the Sipeed Dock.
It is consumed by the v2 project wizard and hardware manager.

The Dock debugger is a dual-interface FTDI device:

- Interface 0 / MI_00 is JTAG and must use WinUSB for `openFPGALoader`.
- Interface 1 / MI_01 is UART and must retain the FTDI serial driver.

The constraint file includes the 27 MHz clock, six active-low LEDs, five
active-low buttons, and the Dock UART. Templates should remove constraints for
ports that are not present in their top module.

Programming modes are SRAM (`-m`, volatile) and verified external flash (`-f
--verify`, persistent). FPGA Studio always labels those modes separately.

