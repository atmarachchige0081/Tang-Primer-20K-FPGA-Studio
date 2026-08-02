`timescale 1ns/1ps
`default_nettype none
module tb_top;
    logic clk_27mhz = 0;
    logic [4:0] btn_n = '1;
    logic [5:0] led_n;
    top dut(.*);
    always #5 clk_27mhz = ~clk_27mhz;
    initial begin
        $dumpfile("build/waves.vcd"); $dumpvars(0, tb_top);
        repeat (5) @(posedge clk_27mhz);
        btn_n[0] <= 0; repeat (2) @(posedge clk_27mhz); btn_n[0] <= 1;
        wait (dut.busy); wait (!dut.busy);
        if (dut.received !== 8'hA5) $fatal(1, "SPI loopback expected A5, got %h", dut.received);
        $display("PASS: SPI mode-0 byte loopback verified"); $finish;
    end
endmodule
`default_nettype wire
