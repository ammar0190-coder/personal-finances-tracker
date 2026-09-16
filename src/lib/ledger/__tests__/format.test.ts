import { Decimal } from "decimal.js";
import { describe, expect, it } from "vitest";
import { formatMoney } from "@/lib/ledger/format";

describe("formatMoney", () => {
  it("always shows two decimal places", () => {
    expect(formatMoney("450.5")).toBe("₹450.50");
    expect(formatMoney("450")).toBe("₹450.00");
    expect(formatMoney("0.05")).toBe("₹0.05");
  });

  it("groups thousands", () => {
    expect(formatMoney(50000)).toBe("₹50,000.00");
    expect(formatMoney("999")).toBe("₹999.00");
    expect(formatMoney("1000")).toBe("₹1,000.00");
  });

  // Indian grouping (lakh/crore), matching the masked "₹xx,xx,xxx" placeholder.
  it("uses Indian digit grouping for large numbers", () => {
    expect(formatMoney("100000")).toBe("₹1,00,000.00");
    expect(formatMoney("1234567.89")).toBe("₹12,34,567.89");
    expect(formatMoney("12345678901.23")).toBe("₹12,34,56,78,901.23");
  });

  it("formats zero, including negative zero, without a sign", () => {
    expect(formatMoney(0)).toBe("₹0.00");
    expect(formatMoney("0")).toBe("₹0.00");
    expect(formatMoney("-0")).toBe("₹0.00");
    expect(formatMoney("-0.004")).toBe("₹0.00");
  });

  it("puts the minus sign before the currency symbol", () => {
    expect(formatMoney("-450.5")).toBe("-₹450.50");
    expect(formatMoney(-1234567)).toBe("-₹12,34,567.00");
  });

  it("rounds half-up to paise, with no float drift", () => {
    expect(formatMoney("0.005")).toBe("₹0.01");
    expect(formatMoney("2.675")).toBe("₹2.68"); // 2.675 is 2.67499… as a float
    expect(formatMoney("-2.675")).toBe("-₹2.68");
  });

  it("accepts Decimal, string and PostgREST numbers alike", () => {
    expect(formatMoney(new Decimal("73349.5"))).toBe("₹73,349.50");
    expect(formatMoney(73349.5)).toBe("₹73,349.50");
    expect(formatMoney("73349.50")).toBe("₹73,349.50");
  });

  it("does not change the value it is given", () => {
    const d = new Decimal("1234.567");
    formatMoney(d);
    expect(d.toString()).toBe("1234.567");
  });
});
