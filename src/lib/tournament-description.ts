export const DESCRIPTION_PREFIX = "foxes-rich-text-v1:";
export type DescriptionNode = { type: string; text?: string; attrs?: { level?: number }; marks?: { type: string }[]; content?: DescriptionNode[] };

export function descriptionDocument(value: string): DescriptionNode {
  if (value.startsWith(DESCRIPTION_PREFIX)) {
    try {
      const parsed = JSON.parse(value.slice(DESCRIPTION_PREFIX.length));
      if (parsed?.type === "doc" && Array.isArray(parsed.content)) return parsed;
    } catch { /* Keep malformed or legacy descriptions readable as plain text. */ }
  }
  return { type: "doc", content: value.split("\n").map(text => ({ type: "paragraph", content: text ? [{ type: "text", text }] : [] })) };
}

export function descriptionText(value: string): string {
  const walk = (node: DescriptionNode): string => {
    if (node.type === "text") return typeof node.text === "string" ? node.text : "";
    if (node.type === "hardBreak") return "\n";
    const content = Array.isArray(node.content) ? node.content.map(walk) : [];
    return content.join(["doc", "bulletList", "orderedList"].includes(node.type) ? "\n" : "");
  };
  return walk(descriptionDocument(value)).trim();
}