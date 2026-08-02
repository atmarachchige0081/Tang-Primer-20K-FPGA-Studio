`timescale 1ns/1ps
`default_nettype none
module top(input logic clk_27mhz, input logic [4:0] btn_n, output logic [5:0] led_n);
    logic [31:0] pc = '0;
    logic [6:0] opcode; logic [4:0] rd,rs1,rs2; logic [2:0] funct3; logic [31:0] immediate_i; logic valid;
    logic decode_activity;
    always_ff @(posedge clk_27mhz) if (!btn_n[0]) pc <= '0; else pc <= pc + 32'd4;
    rv32i_decode decoder(.instruction(32'h00100093),.opcode,.rd,.rs1,.rs2,.funct3,.immediate_i,.valid);
    assign decode_activity = ^{opcode, rs1, rs2, funct3, immediate_i};
    assign led_n = ~{valid, rd[0], pc[5:3], decode_activity ^ ^btn_n[4:1]};
endmodule
`default_nettype wire
