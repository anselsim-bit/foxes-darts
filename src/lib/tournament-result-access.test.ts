import { describe, expect, it } from "vitest";
import { assertResultWritable } from "./tournament-result-access";

describe("result correction authorization", () => {
  it("does not allow a guest or captain to replace a completed result", () => {
    expect(() => assertResultWritable("winning-team", false)).toThrow("corriger");
  });
  it("allows the verified tournament manager to correct a completed result", () => {
    expect(() => assertResultWritable("winning-team", true)).not.toThrow();
  });
  it("permits an initial report after the separate code or captain authorization", () => {
    expect(() => assertResultWritable(null, false)).not.toThrow();
  });
});