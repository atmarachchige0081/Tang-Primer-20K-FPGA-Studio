import { describe, expect, it } from "vitest";
import { needsJtagDriverRepair } from "./hardware";

describe("JTAG recovery routing", () => {
  it("opens the driver guide for an inaccessible Interface 0", () => {
    expect(needsJtagDriverRepair({ success: false, failureMessage: "Windows cannot open JTAG Interface 0. Install WinUSB on Interface 0 only." })).toBe(true);
  });

  it("does not launch a driver tool for unrelated or successful detection", () => {
    expect(needsJtagDriverRepair({ success: false, failureMessage: "No FPGA cable was detected." })).toBe(false);
    expect(needsJtagDriverRepair({ success: true })).toBe(false);
  });
});
