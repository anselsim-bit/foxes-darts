import { describe, expect, it } from "vitest";
import { allowsFoxesRegistration } from "./registration-channel";

describe("HelloAsso registration channel", () => {
  it("blocks player self-registration when a HelloAsso link exists", () => {
    expect(allowsFoxesRegistration("https://www.helloasso.com/associations/foxes/evenements/doublettes")).toBe(false);
  });
  it("keeps player self-registration when no ticket office is linked", () => {
    expect(allowsFoxesRegistration(null)).toBe(true);
    expect(allowsFoxesRegistration("")).toBe(true);
  });
});