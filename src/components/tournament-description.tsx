import { Fragment, type ReactNode } from "react";
import { descriptionDocument, type DescriptionNode } from "@/lib/tournament-description";

export function TournamentDescription({ value }: { value: string }) {
  function render(node: DescriptionNode, key: number): ReactNode {
    const children = Array.isArray(node.content) ? node.content.map(render) : null;
    if (node.type === "text") {
      let text: ReactNode = typeof node.text === "string" ? node.text : "";
      for (const mark of node.marks ?? []) {
        if (mark.type === "bold") text = <strong>{text}</strong>;
        if (mark.type === "italic") text = <em>{text}</em>;
        if (mark.type === "underline") text = <u>{text}</u>;
        if (mark.type === "strike") text = <s>{text}</s>;
      }
      return <Fragment key={key}>{text}</Fragment>;
    }
    switch (node.type) {
      case "paragraph": return <p key={key}>{children || <br />}</p>;
      case "heading": return <h3 key={key} className="font-body text-xl font-bold normal-case tracking-normal">{children}</h3>;
      case "bulletList": return <ul key={key} className="list-disc pl-6">{children}</ul>;
      case "orderedList": return <ol key={key} className="list-decimal pl-6">{children}</ol>;
      case "listItem": return <li key={key}>{children}</li>;
      case "blockquote": return <blockquote key={key} className="border-l-2 border-primary pl-4 italic">{children}</blockquote>;
      case "hardBreak": return <br key={key} />;
      default: return <Fragment key={key}>{children}</Fragment>;
    }
  }
  return <div className="mt-6 space-y-3 break-words text-muted-foreground [&_p]:min-h-5 [&_li_p]:my-1">{render(descriptionDocument(value), 0)}</div>;
}