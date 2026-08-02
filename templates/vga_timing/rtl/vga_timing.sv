`timescale 1ns/1ps
`default_nettype none
module vga_timing #(
    parameter integer H_ACTIVE = 640, H_FRONT = 16, H_SYNC = 96, H_BACK = 48,
    parameter integer V_ACTIVE = 480, V_FRONT = 10, V_SYNC = 2,  V_BACK = 33
) (
    input logic pixel_clk, input logic rst_n,
    output logic hsync_n, output logic vsync_n, output logic active_video,
    output logic [$clog2(H_ACTIVE+H_FRONT+H_SYNC+H_BACK)-1:0] x,
    output logic [$clog2(V_ACTIVE+V_FRONT+V_SYNC+V_BACK)-1:0] y
);
    localparam integer H_TOTAL=H_ACTIVE+H_FRONT+H_SYNC+H_BACK;
    localparam integer V_TOTAL=V_ACTIVE+V_FRONT+V_SYNC+V_BACK;
    always_ff @(posedge pixel_clk) begin
        if (!rst_n) begin x <= '0; y <= '0; end
        else if (x == H_TOTAL-1) begin x <= '0; y <= (y == V_TOTAL-1) ? '0 : y + 1'b1; end
        else x <= x + 1'b1;
    end
    always_comb begin
        active_video = (x < H_ACTIVE) && (y < V_ACTIVE);
        hsync_n = !((x >= H_ACTIVE+H_FRONT) && (x < H_ACTIVE+H_FRONT+H_SYNC));
        vsync_n = !((y >= V_ACTIVE+V_FRONT) && (y < V_ACTIVE+V_FRONT+V_SYNC));
    end
endmodule
`default_nettype wire
