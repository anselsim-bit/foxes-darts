import { useEffect, useId, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Italic, Underline, Strikethrough, Heading2, List, ListOrdered, Quote, Undo2, Redo2, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DESCRIPTION_PREFIX, descriptionDocument, descriptionText } from "@/lib/tournament-description";

export function DescriptionEditor({ value = "", name = "description", onChange }: { value?: string; name?: string; onChange?: (value: string) => void }) {
  const id = useId();
  const [stored, setStored] = useState(value);
  const [emojis, setEmojis] = useState(false);
  const [, updateToolbar] = useState(0);
  const editor = useEditor({
    extensions: [StarterKit.configure({ link: false })],
    immediatelyRender: false,
    content: descriptionDocument(value),
    editorProps: { attributes: { role: "textbox", "aria-label": "Description", "aria-multiline": "true", class: "min-h-64 max-h-[32rem] overflow-y-auto px-4 py-3 outline-none space-y-3 break-words [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_h2]:font-body [&_h2]:text-xl [&_h2]:normal-case [&_h2]:tracking-normal [&_blockquote]:border-l-2 [&_blockquote]:border-primary [&_blockquote]:pl-4" } },
    onUpdate: ({ editor }) => {
      const next = editor.isEmpty ? "" : DESCRIPTION_PREFIX + JSON.stringify(editor.getJSON());
      setStored(next); onChange?.(next);
    },
    onTransaction: () => updateToolbar(n => n + 1),
  });
  useEffect(() => {
    if (editor && value !== stored) {
      editor.commands.setContent(descriptionDocument(value), { emitUpdate: false });
      setStored(value);
    }
  }, [value, editor]);
  useEffect(() => {
    const form = document.getElementById(id)?.closest("form");
    const reset = () => { editor?.commands.clearContent(); setStored(""); onChange?.(""); };
    form?.addEventListener("reset", reset);
    return () => form?.removeEventListener("reset", reset);
  }, [editor, id, onChange]);
  const tools = [
    { label: "Gras", icon: Bold, active: editor?.isActive("bold"), run: () => editor?.chain().focus().toggleBold().run() },
    { label: "Italique", icon: Italic, active: editor?.isActive("italic"), run: () => editor?.chain().focus().toggleItalic().run() },
    { label: "Souligné", icon: Underline, active: editor?.isActive("underline"), run: () => editor?.chain().focus().toggleUnderline().run() },
    { label: "Barré", icon: Strikethrough, active: editor?.isActive("strike"), run: () => editor?.chain().focus().toggleStrike().run() },
    { label: "Titre", icon: Heading2, active: editor?.isActive("heading"), run: () => editor?.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: "Liste à puces", icon: List, active: editor?.isActive("bulletList"), run: () => editor?.chain().focus().toggleBulletList().run() },
    { label: "Liste numérotée", icon: ListOrdered, active: editor?.isActive("orderedList"), run: () => editor?.chain().focus().toggleOrderedList().run() },
    { label: "Citation", icon: Quote, active: editor?.isActive("blockquote"), run: () => editor?.chain().focus().toggleBlockquote().run() },
    { label: "Annuler", icon: Undo2, run: () => editor?.chain().focus().undo().run() },
    { label: "Rétablir", icon: Redo2, run: () => editor?.chain().focus().redo().run() },
    { label: "Émojis", icon: Smile, active: emojis, run: () => setEmojis(v => !v) },
  ];
  return <div id={id} className="min-w-0 sm:col-span-2">
    <label className="mb-1 block text-sm font-medium" onClick={() => editor?.commands.focus()}>Description</label>
    <div className="overflow-hidden rounded-md border border-input bg-card focus-within:border-primary">
      <TooltipProvider><div role="toolbar" aria-label="Mise en forme de la description" className="flex flex-wrap gap-1 border-b border-border bg-muted p-2">
        {tools.map(({ label, icon: Icon, active, run }) => <Tooltip key={label}><TooltipTrigger asChild><Button type="button" variant={active ? "secondary" : "ghost"} size="icon" aria-label={label} aria-pressed={!!active} disabled={!editor} onClick={run}><Icon /></Button></TooltipTrigger><TooltipContent>{label}</TooltipContent></Tooltip>)}
      </div></TooltipProvider>
      {emojis && <div className="flex flex-wrap gap-1 border-b border-border p-2" aria-label="Choisir un émoji">{["🎯", "🏆", "🦊", "🎉", "📅", "📍", "⏰", "✅", "🔥", "🤝", "🥇", "🍻"].map(emoji => <Button key={emoji} type="button" variant="ghost" size="icon" aria-label={`Insérer ${emoji}`} onClick={() => { editor?.chain().focus().insertContent(emoji).run(); setEmojis(false); }}>{emoji}</Button>)}</div>}
      <EditorContent editor={editor} />
    </div>
    <input type="hidden" name={name} value={stored} />
    <span className="sr-only">{descriptionText(stored)}</span>
  </div>;
}