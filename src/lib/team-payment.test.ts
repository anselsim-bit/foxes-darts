import { describe, expect, it } from "vitest";
import { teamIsPaid } from "./team-payment";

describe("team payment", () => {
  it("always marks HelloAsso teams paid", () => {
    expect(teamIsPaid(123, false)).toBe(true);
  });
  it("starts other teams unpaid", () => {
    expect(teamIsPaid(null)).toBe(false);
  });
  it("lets manual payments be marked and unmarked", () => {
    expect(teamIsPaid(null, true)).toBe(true);
    expect(teamIsPaid(null, false)).toBe(false);
  });
});