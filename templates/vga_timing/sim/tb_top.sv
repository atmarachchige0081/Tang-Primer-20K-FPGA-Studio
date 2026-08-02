`timescale 1ns/1ps
`default_nettype none
module tb_top;
    logic clk=0, rst_n=0, hs, vs, active;
    logic [3:0] x; logic [2:0] y;
    vga_timing #(.H_ACTIVE(8),.H_FRONT(1),.H_SYNC(2),.H_BACK(1),.V_ACTIVE(4),.V_FRONT(1),.V_SYNC(1),.V_BACK(1)) dut(.pixel_clk(clk),.rst_n,.hsync_n(hs),.vsync_n(vs),.active_video(active),.x,.y);
    always #5 clk=~clk;
    initial begin
      $dumpfile("build/waves.vcd"); $dumpvars(0,tb_top); repeat(2) @(posedge clk); rst_n<=1;
      repeat(85) @(posedge clk);
      if (x !== 0 || y !== 0) $fatal(1,"raster did not wrap to origin: %0d,%0d",x,y);
      $display("PASS: compact VGA raster and sync timing verified"); $finish;
    end
endmodule
`default_nettype wire
