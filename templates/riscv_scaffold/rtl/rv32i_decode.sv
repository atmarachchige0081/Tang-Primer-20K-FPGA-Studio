`timescale 1ns/1ps
`default_nettype none
module rv32i_decode(
    input logic [31:0] instruction,
    output logic [6:0] opcode,
    output logic [4:0] rd, rs1, rs2,
    output logic [2:0] funct3,
    output logic [31:0] immediate_i,
    output logic valid
);
    assign opcode = instruction[6:0];
    assign rd = instruction[11:7];
    assign funct3 = instruction[14:12];
    assign rs1 = instruction[19:15];
    assign rs2 = instruction[24:20];
    assign immediate_i = {{20{instruction[31]}}, instruction[31:20]};
    assign valid = (opcode == 7'b0010011) || (opcode == 7'b0110011) ||
                   (opcode == 7'b0000011) || (opcode == 7'b0100011) ||
                   (opcode == 7'b1100011) || (opcode == 7'b1101111) ||
                   (opcode == 7'b1100111) || (opcode == 7'b0110111) ||
                   (opcode == 7'b0010111);
endmodule
`default_nettype wire
