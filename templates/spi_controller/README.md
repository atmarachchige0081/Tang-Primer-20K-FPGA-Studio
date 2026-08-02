# SPI controller laboratory

Press button 0 to transmit `0xA5`. The teaching top loops MOSI back to MISO,
so the received byte is visible in the final LED bits and verified in simulation.
Expose `sclk`, `mosi`, `miso`, and `cs_n` as top-level ports only after adding
the correct expansion-header pins for your hardware.

