import type { CommandResult } from "../types";

export function needsJtagDriverRepair(result: Pick<CommandResult, "success" | "failureMessage">): boolean {
  if (result.success) return false;
  const message = result.failureMessage?.toLowerCase() ?? "";
  return message.includes("windows cannot open jtag interface 0")
    || (message.includes("winusb") && message.includes("interface 0"));
}
