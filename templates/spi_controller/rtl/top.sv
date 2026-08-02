`timescale 1ns/1ps
`default_nettype none

module top (
    input  logic       clk_27mhz,
    input  logic [4:0] btn_n,
    output logic [5:0] led_n
);
    logic [2:0] reset_pipe = '0;
    logic button_q;
    logic start;
    logic sclk, mosi, cs_n, busy, done;
    logic [7:0] received;

    always_ff @(posedge clk_27mhz) begin
        reset_pipe <= {reset_pipe[1:0], 1'b1};
        button_q <= btn_n[0];
    end
    assign start = button_q & ~btn_n[0];

    spi_master #(.CLOCK_DIV(16)) controller (
        .clk(clk_27mhz), .rst_n(reset_pipe[2]), .start_i(start), .tx_data_i(8'hA5),
        .miso_i(mosi), .sclk_o(sclk), .mosi_o(mosi), .cs_n_o(cs_n), .busy_o(busy),
        .done_o(done), .rx_data_o(received)
    );
    assign led_n = ~{done, busy, cs_n, sclk, received[1:0]};
endmodule

`default_nettype wire
