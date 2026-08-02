`timescale 1ns/1ps
`default_nettype none

module uart_tx #(
    parameter integer CLOCK_HZ = 27_000_000,
    parameter integer BAUD_RATE = 115_200
) (
    input logic clk,
    input logic rst_n,
    input logic [7:0] data_i,
    input logic valid_i,
    output logic ready_o,
    output logic tx_o
);
    localparam integer CLKS_PER_BIT = (CLOCK_HZ + BAUD_RATE / 2) / BAUD_RATE;
    localparam integer COUNT_WIDTH = (CLKS_PER_BIT <= 1) ? 1 : $clog2(CLKS_PER_BIT);
    localparam logic [COUNT_WIDTH-1:0] LAST_COUNT = COUNT_WIDTH'(CLKS_PER_BIT - 1);
    logic [COUNT_WIDTH-1:0] count;
    logic [3:0] bit_index;
    logic [9:0] frame;
    logic busy;
    assign ready_o = ~busy;
    assign tx_o = busy ? frame[bit_index] : 1'b1;

    always_ff @(posedge clk) begin
        if (!rst_n) begin count <= '0; bit_index <= '0; frame <= 10'h3ff; busy <= 1'b0; end
        else if (!busy) begin
            count <= '0; bit_index <= '0;
            if (valid_i) begin frame <= {1'b1, data_i, 1'b0}; busy <= 1'b1; end
        end else if (count == LAST_COUNT) begin
            count <= '0;
            if (bit_index == 4'd9) begin bit_index <= '0; busy <= 1'b0; end
            else bit_index <= bit_index + 1'b1;
        end else count <= count + 1'b1;
    end
endmodule

`default_nettype wire
