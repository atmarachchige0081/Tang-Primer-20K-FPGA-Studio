import { describe, expect, it } from "vitest";
import { fileName, languageForPath } from "./language";

describe("HDL language mapping", () => {
  it("recognizes Verilog and SystemVerilog", () => {
    expect(languageForPath("rtl/counter.v")).toBe("verilog");
    expect(languageForPath("rtl/top.sv")).toBe("systemverilog");
  });

  it("uses a safe plain text fallback", () => {
    expect(languageForPath("constraints/board.cst")).toBe("plaintext");
    expect(languageForPath("unknown.extension")).toBe("plaintext");
  });

  it("normalizes Windows and POSIX file names", () => {
    expect(fileName("rtl/top.sv")).toBe("top.sv");
    expect(fileName("rtl\\uart\\tx.sv")).toBe("tx.sv");
  });
});
