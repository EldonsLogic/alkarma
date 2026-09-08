"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect } from "react";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  dir?: string;
}

export function RichTextEditor({ value, onChange, placeholder = "Write something…", minHeight = 200, dir }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "outline-none prose prose-sm max-w-none px-4 py-3 text-[13px] text-[#1e293b]",
        style: `min-height: ${minHeight}px`,
      },
    },
  });

  // Sync external value changes (e.g. when loading a different record)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (!editor) return null;

  const btn = (active: boolean, onClick: () => void, children: React.ReactNode) => (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={`px-2 py-1 text-[12px] font-bold rounded transition-colors ${
        active ? "bg-[#1e293b] text-white" : "text-[#64748b] hover:bg-[#f1f5f9]"
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="border border-[#e2e8f0] rounded-sm overflow-hidden" dir={dir}>
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-[#e2e8f0] bg-[#f8fafc] flex-wrap">
        {btn(editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), <b>B</b>)}
        {btn(editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), <i>I</i>)}
        {btn(editor.isActive("strike"), () => editor.chain().focus().toggleStrike().run(), <s>S</s>)}
        <div className="w-px h-4 bg-[#e2e8f0] mx-1" />
        {btn(editor.isActive("heading", { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), "H2")}
        {btn(editor.isActive("heading", { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), "H3")}
        <div className="w-px h-4 bg-[#e2e8f0] mx-1" />
        {btn(editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run(), "• List")}
        {btn(editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run(), "1. List")}
        {btn(editor.isActive("blockquote"), () => editor.chain().focus().toggleBlockquote().run(), "❝")}
        <div className="w-px h-4 bg-[#e2e8f0] mx-1" />
        {btn(false, () => {
          const url = window.prompt("URL");
          if (url) editor.chain().focus().setLink({ href: url }).run();
        }, "🔗")}
        {btn(false, () => editor.chain().focus().unsetLink().run(), "✂️")}
        <div className="w-px h-4 bg-[#e2e8f0] mx-1" />
        {btn(false, () => editor.chain().focus().undo().run(), "↩")}
        {btn(false, () => editor.chain().focus().redo().run(), "↪")}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
