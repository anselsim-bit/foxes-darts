import { describe, expect, it } from "vitest";
import { DESCRIPTION_PREFIX, descriptionDocument, descriptionText } from "./tournament-description";

describe("tournament description storage", () => {
  it("preserves legacy descriptions and emoji", () => {
    expect(descriptionText("Tournoi 🎯\nDoublette")).toBe("Tournoi 🎯\nDoublette");
  });
  it("extracts readable text from formatted descriptions", () => {
    const value = DESCRIPTION_PREFIX + JSON.stringify({ type: "doc", content: [{ type: "heading", content: [{ type: "text", text: "Tournoi 🎯", marks: [{ type: "bold" }] }] }, { type: "paragraph", content: [{ type: "text", text: "Doublette" }] }] });
    expect(descriptionText(value)).toBe("Tournoi 🎯\nDoublette");
    expect(descriptionDocument(value).content?.[0]?.type).toBe("heading");
  });
  it("does not interpret legacy HTML as executable markup", () => {
    expect(descriptionDocument('<script>alert(1)</script>').content?.[0]?.content?.[0]?.text).toBe('<script>alert(1)</script>');
  });
});