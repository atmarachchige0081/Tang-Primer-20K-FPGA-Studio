# RISC-V core scaffold

This is deliberately a verified starting point, not a falsely advertised CPU.
It contains an RV32I field decoder, sign extension, and a program-counter shell.
Grow it in stages: register file, ALU, branch unit, load/store interface, control
FSM, instruction memory, then compliance tests.

