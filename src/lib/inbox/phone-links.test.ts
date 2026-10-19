import { describe, expect, it } from "vitest";
import { splitPhoneNumbers } from "./phone-links";
import { toDialablePhone } from "@/lib/whatsapp/phone-utils";

describe("toDialablePhone", () => {
  it("accepts +, 00 and bare country-code forms", () => {
    expect(toDialablePhone("+971 50 123 4567")).toBe("+971501234567");
    expect(toDialablePhone("00971501234567")).toBe("+971501234567");
    expect(toDialablePhone("971-50-123-4567")).toBe("+971501234567");
  });

  it("rejects text and numbers too short to be international", () => {
    expect(toDialablePhone("john")).toBeNull();
    expect(toDialablePhone("12345")).toBeNull();
    expect(toDialablePhone("")).toBeNull();
    expect(toDialablePhone(null)).toBeNull();
  });
});

describe("splitPhoneNumbers", () => {
  it("links an international number inside text", () => {
    expect(splitPhoneNumbers("Call +971 50 123 4567 today")).toEqual([
      { kind: "text", text: "Call " },
      { kind: "phone", text: "+971 50 123 4567", phone: "+971501234567" },
      { kind: "text", text: " today" },
    ]);
  });

  it("links a bare 10–15 digit run", () => {
    expect(splitPhoneNumbers("my number 971501234567")).toEqual([
      { kind: "text", text: "my number " },
      { kind: "phone", text: "971501234567", phone: "+971501234567" },
    ]);
  });

  it("leaves dates, times, prices and short ids alone", () => {
    for (const text of [
      "Meeting on 2026-10-19 14:30",
      "Total 1,250.00 AED",
      "Order #48213",
      "Version 1.2.3.4567",
    ]) {
      expect(splitPhoneNumbers(text)).toEqual([{ kind: "text", text }]);
    }
  });

  it("returns [] for empty text", () => {
    expect(splitPhoneNumbers("")).toEqual([]);
  });
});
