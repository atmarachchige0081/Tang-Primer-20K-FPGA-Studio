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
    localparam integer H_TOTAL = H_ACTIVE + H_FRONT + H_SYNC + H_BACK;
    localparam integer V_TOTAL = V_ACTIVE + V_FRONT + V_SYNC + V_BACK;
    localparam integer H_WIDTH = $clog2(H_TOTAL);
    localparam integer V_WIDTH = $clog2(V_TOTAL);
    localparam logic [H_WIDTH-1:0] H_LAST = H_TOTAL - 1;
    localparam logic [V_WIDTH-1:0] V_LAST = V_TOTAL - 1;
    localparam logic [H_WIDTH-1:0] H_ACTIVE_LIMIT = H_ACTIVE;
    localparam logic [V_WIDTH-1:0] V_ACTIVE_LIMIT = V_ACTIVE;
    localparam logic [H_WIDTH-1:0] H_SYNC_START = H_ACTIVE + H_FRONT;
    localparam logic [H_WIDTH-1:0] H_SYNC_END = H_ACTIVE + H_FRONT + H_SYNC;
    localparam logic [V_WIDTH-1:0] V_SYNC_START = V_ACTIVE + V_FRONT;
    localparam logic [V_WIDTH-1:0] V_SYNC_END = V_ACTIVE + V_FRONT + V_SYNC;
    always_ff @(posedge pixel_clk) begin
        if (!rst_n) begin x <= '0; y <= '0; end
        else if (x == H_LAST) begin x <= '0; y <= (y == V_LAST) ? '0 : y + 1'b1; end
        else x <= x + 1'b1;
    end
    always_comb begin
        active_video = (x < H_ACTIVE_LIMIT) && (y < V_ACTIVE_LIMIT);
        hsync_n = !((x >= H_SYNC_START) && (x < H_SYNC_END));
        vsync_n = !((y >= V_SYNC_START) && (y < V_SYNC_END));
    end
endmodule
`default_nettype wire
