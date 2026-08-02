`timescale 1ns/1ps
`default_nettype none

module uart_rx #(
    parameter integer CLOCK_HZ = 27_000_000,
    parameter integer BAUD_RATE = 115_200
) (
    input logic clk,
    input logic rst_n,
    input logic rx_i,
    output logic [7:0] data_o,
    output logic valid_o,
    output logic framing_error_o
);
    localparam integer CLKS_PER_BIT = (CLOCK_HZ + BAUD_RATE / 2) / BAUD_RATE;
    localparam integer COUNT_WIDTH = (CLKS_PER_BIT <= 1) ? 1 : $clog2(CLKS_PER_BIT);
    localparam logic [COUNT_WIDTH-1:0] HALF_COUNT = COUNT_WIDTH'((CLKS_PER_BIT / 2) - 1);
    localparam logic [COUNT_WIDTH-1:0] LAST_COUNT = COUNT_WIDTH'(CLKS_PER_BIT - 1);
    typedef enum logic [1:0] {IDLE, START, DATA, STOP} state_t;
    state_t state;
    logic [COUNT_WIDTH-1:0] count;
    logic [2:0] bit_index;
    logic [7:0] shift;

    always_ff @(posedge clk) begin
        if (!rst_n) begin
            state <= IDLE; count <= '0; bit_index <= '0; shift <= '0;
            data_o <= '0; valid_o <= 1'b0; framing_error_o <= 1'b0;
        end else begin
            valid_o <= 1'b0;
            framing_error_o <= 1'b0;
            case (state)
                IDLE: begin count <= '0; bit_index <= '0; if (!rx_i) state <= START; end
                START: if (count == HALF_COUNT) begin
                    count <= '0;
                    if (rx_i) state <= IDLE;
                    else state <= DATA;
                end else count <= count + 1'b1;
                DATA: if (count == LAST_COUNT) begin
                    count <= '0; shift[bit_index] <= rx_i;
                    if (bit_index == 3'd7) begin bit_index <= '0; state <= STOP; end
                    else bit_index <= bit_index + 1'b1;
                end else count <= count + 1'b1;
                STOP: if (count == LAST_COUNT) begin
                    count <= '0; state <= IDLE;
                    if (rx_i) begin data_o <= shift; valid_o <= 1'b1; end
                    else framing_error_o <= 1'b1;
                end else count <= count + 1'b1;
                default: state <= IDLE;
            endcase
        end
    end
endmodule

`default_nettype wire
