"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import Highlight from "@tiptap/extension-highlight";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import Superscript from "@tiptap/extension-superscript";
import Subscript from "@tiptap/extension-subscript";
import { useEffect } from "react";

type Props = {
  initialContent?: Record<string, unknown> | null;
  onChange?: (json: Record<string, unknown>) => void;
  placeholder?: string;
};

export function RichTextEditor({ initialContent, onChange, placeholder }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4, 5, 6] },
      }),
      Underline,
      Highlight,
      Superscript,
      Subscript,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer" },
      }),
      Image,
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({
        placeholder: placeholder || "Write your article…",
      }),
    ],
    content: initialContent || { type: "doc", content: [{ type: "paragraph" }] },
    immediatelyRender: false,
    onUpdate: ({ editor: current }) => {
      onChange?.(current.getJSON() as Record<string, unknown>);
    },
  });

  useEffect(() => {
    if (!editor || !initialContent) return;
    const current = JSON.stringify(editor.getJSON());
    const next = JSON.stringify(initialContent);
    if (current !== next) editor.commands.setContent(initialContent);
  }, [editor, initialContent]);

  if (!editor) return null;

  return (
    <div className="rich-editor">
      <div className="rich-editor-toolbar" role="toolbar" aria-label="Formatting">
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()}>Bold</button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()}>Italic</button>
        <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()}>Underline</button>
        <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()}>Strike</button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</button>
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()}>List</button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()}>Ordered</button>
        <button type="button" onClick={() => editor.chain().focus().toggleTaskList().run()}>Tasks</button>
        <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()}>Quote</button>
        <button type="button" onClick={() => editor.chain().focus().toggleCodeBlock().run()}>Code</button>
        <button type="button" onClick={() => editor.chain().focus().setHorizontalRule().run()}>Divider</button>
        <button
          type="button"
          onClick={() => {
            const href = window.prompt("URL");
            if (!href) return;
            editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
          }}
        >
          Link
        </button>
        <button
          type="button"
          onClick={() => {
            const src = window.prompt("Image URL");
            if (!src) return;
            editor.chain().focus().setImage({ src }).run();
          }}
        >
          Image
        </button>
        <button
          type="button"
          onClick={() =>
            editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
          }
        >
          Table
        </button>
        <button type="button" onClick={() => editor.chain().focus().undo().run()}>Undo</button>
        <button type="button" onClick={() => editor.chain().focus().redo().run()}>Redo</button>
      </div>
      <EditorContent editor={editor} className="rich-editor-surface" />
    </div>
  );
}
