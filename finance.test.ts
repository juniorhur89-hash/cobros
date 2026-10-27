import { describe, expect, it } from "vitest";
import { addMonths, generatePlan, installmentStatus } from "./finance";

describe("installmentStatus", () => {
  it("a partial payment never marks the installment as paid", () => {
    expect(installmentStatus(500, 499.99, "2099-01-01", "2026-10-26")).toBe("parcial");
  });
  it("is paid only when the full amount is covered", () => {
    expect(installmentStatus(500, 500, "2020-01-01", "2026-10-26")).toBe("pagada");
  });
  it("is overdue when past due and not fully paid", () => {
    expect(installmentStatus(500, 200, "2026-10-25", "2026-10-26")).toBe("vencida");
  });
});

describe("generatePlan", () => {
  it("splits the remaining balance and totals the contract price", () => {
    const plan = generatePlan({ total: 10000, downPayment: 1000, downPaymentDate: "2026-01-15", count: 7, firstDueDate: "2026-02-15" });
    expect(plan[0]).toMatchObject({ kind: "inicial", amount: 1000 });
    expect(plan).toHaveLength(8);
    const sum = plan.reduce((a, r) => a + r.amount, 0);
    expect(Math.round(sum * 100) / 100).toBe(10000);
  });
  it("clamps month ends", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
  });
});
