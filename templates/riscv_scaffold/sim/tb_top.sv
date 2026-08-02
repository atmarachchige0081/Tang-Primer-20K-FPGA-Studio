`timescale 1ns/1ps
`default_nettype none
module tb_top;
    logic [31:0] instruction; logic [6:0] opcode; logic [4:0] rd,rs1,rs2; logic [2:0] funct3; logic [31:0] immediate_i; logic valid;
    rv32i_decode dut(.*);
    initial begin
      $dumpfile("build/waves.vcd"); $dumpvars(0,tb_top);
      instruction=32'hfff10093; #1;
      if (!valid || opcode!=7'b0010011 || rd!=1 || rs1!=2 || immediate_i!=32'hffffffff) $fatal(1,"ADDI decode failed");
      instruction=32'h00000000; #1; if(valid) $fatal(1,"illegal opcode accepted");
      $display("PASS: RV32I field and sign-extension decode verified"); $finish;
    end
endmodule
`default_nettype wire
