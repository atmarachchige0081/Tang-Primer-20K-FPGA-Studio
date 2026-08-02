`timescale 1ns/1ps
`default_nettype none
module top(input logic clk_27mhz, input logic [4:0] btn_n, output logic [5:0] led_n);
    logic [2:0] rst = '0;
    logic hsync_n, vsync_n, active_video;
    logic [9:0] x, y;
    always_ff @(posedge clk_27mhz) rst <= {rst[1:0], 1'b1};
    vga_timing timing(.pixel_clk(clk_27mhz), .rst_n(rst[2] & btn_n[0]), .hsync_n, .vsync_n, .active_video, .x, .y);
    assign led_n = ~{vsync_n, hsync_n, active_video, ^x, ^y, ^btn_n};
endmodule
`default_nettype wire
