`timescale 1ns/1ps
`default_nettype none

// SPI mode-0 byte master. Data changes on falling edges and is sampled on rising edges.
module spi_master #(
    parameter integer CLOCK_DIV = 4
) (
    input  logic       clk,
    input  logic       rst_n,
    input  logic       start_i,
    input  logic [7:0] tx_data_i,
    input  logic       miso_i,
    output logic       sclk_o,
    output logic       mosi_o,
    output logic       cs_n_o,
    output logic       busy_o,
    output logic       done_o,
    output logic [7:0] rx_data_o
);
    localparam integer DIV_WIDTH = (CLOCK_DIV <= 1) ? 1 : $clog2(CLOCK_DIV);
    logic [DIV_WIDTH-1:0] divider;
    logic [3:0] edge_count;
    logic [7:0] tx_shift;
    logic [7:0] rx_shift;

    assign mosi_o = tx_shift[7];
    assign cs_n_o = ~busy_o;

    always_ff @(posedge clk) begin
        if (!rst_n) begin
            divider  <= '0;
            edge_count <= '0;
            tx_shift <= '0;
            rx_shift <= '0;
            rx_data_o <= '0;
            sclk_o <= 1'b0;
            busy_o <= 1'b0;
            done_o <= 1'b0;
        end else begin
            done_o <= 1'b0;
            if (!busy_o) begin
                sclk_o <= 1'b0;
                divider <= '0;
                if (start_i) begin
                    busy_o <= 1'b1;
                    edge_count <= '0;
                    tx_shift <= tx_data_i;
                end
            end else if (divider == DIV_WIDTH'(CLOCK_DIV - 1)) begin
                divider <= '0;
                sclk_o <= ~sclk_o;
                edge_count <= edge_count + 1'b1;
                if (!sclk_o) begin
                    rx_shift <= {rx_shift[6:0], miso_i};
                end else begin
                    tx_shift <= {tx_shift[6:0], 1'b0};
                    if (edge_count == 4'd15) begin
                        busy_o <= 1'b0;
                        done_o <= 1'b1;
                        rx_data_o <= rx_shift;
                        sclk_o <= 1'b0;
                    end
                end
            end else begin
                divider <= divider + 1'b1;
            end
        end
    end
endmodule

`default_nettype wire
