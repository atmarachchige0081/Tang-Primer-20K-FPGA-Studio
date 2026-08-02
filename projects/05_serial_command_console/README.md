# Friendly UART command console

This beginner project turns the FPGA into a small command-driven device. Open
FPGA Studio's UART view at **115200 baud, 8-N-1**, connect to the board UART,
and send a command followed by Enter.

```text
FPGA console ready
Type HELP then Enter.
> PING
PONG - your UART link works!
> LED ON
OK - LED is now ON.
> STATUS
STATUS: link OK, LED ON, 115200 baud
```

Commands are case-insensitive: `HELP`, `PING`, `LED ON`, `LED OFF`, `STATUS`,
and `ABOUT`. Unknown input gets a friendly hint instead of silently failing.

## What to learn in the code

- `uart_rx.sv` finds the start bit and samples eight data bits near their center.
- `top.sv` uppercases and stores printable bytes until Enter arrives.
- The command comparisons select a response and optionally update LED state.
- `uart_tx.sv` sends each response through a ready/valid handshake.
- `tb_top.sv` behaves like a PC terminal and checks replies automatically.

## Verify before hardware

```powershell
.\fpga.ps1 lint  -Project projects/05_serial_command_console
.\fpga.ps1 sim   -Project projects/05_serial_command_console
.\fpga.ps1 wave  -Project projects/05_serial_command_console
.\fpga.ps1 build -Project projects/05_serial_command_console
```

After those pass, use **SRAM** for a reversible upload. On the Primer 20K Dock,
the UART remains Interface 1/COM while WinUSB belongs only on JTAG Interface 0.
