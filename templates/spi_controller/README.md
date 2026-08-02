# SPI controller laboratory

Press any button to transmit `0xA5`. The teaching top loops MOSI back to MISO;
the final two LEDs show parity-folded halves of the received byte, and the
complete byte is verified in simulation.
Expose `sclk`, `mosi`, `miso`, and `cs_n` as top-level ports only after adding
the correct expansion-header pins for your hardware.

