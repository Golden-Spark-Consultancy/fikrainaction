"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import CharacterCount from "@tiptap/extension-character-count";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import TiptapImage from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import TextAlign from "@tiptap/extension-text-align";
import StarterKit from "@tiptap/starter-kit";
import { common, createLowlight } from "lowlight";
import { useEffect, useRef, useState } from "react";
import { firebaseAuthorizedFetch } from "../../lib/firebase/api";
import { youtubeEmbedUrl } from "../../lib/sanitize";

type Props = {
  initialContent?: Record<string, unknown> | null;
  onChange?: (json: Record<string, unknown>) => void;
  placeholder?: string;
  dir?: "rtl" | "ltr";
  locale?: "ar" | "en";
  /** Opens a media picker; call `insert` with the chosen image URL/alt. */
  onRequestMedia?: (insert: (src: string, alt?: string) => void) => void;
};

const lowlight = createLowlight(common);
lowlight.registerAlias({ html: "xml" });

const CODE_LANGUAGES: { value: string; label: string }[] = [
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "json", label: "JSON" },
  { value: "bash", label: "Bash" },
  { value: "sql", label: "SQL" },
  { value: "plaintext", label: "Plain text" },
];

const CALLOUT_VARIANTS = ["info", "warning", "success", "error"] as const;
type CalloutVariant = (typeof CALLOUT_VARIANTS)[number];

/** Renders a YouTube embed. Stores both the original URL and the resolved embed src. */
const Youtube = Node.create({
  name: "youtube",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      src: { default: null, rendered: false },
      url: { default: null, rendered: false },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-youtube-video]",
        getAttrs: (dom) => {
          const iframe = (dom as HTMLElement).querySelector("iframe");
          return {
            src: iframe?.getAttribute("src") || null,
            url: (dom as HTMLElement).getAttribute("data-url") || null,
          };
        },
      },
    ];
  },

  renderHTML({ node }) {
    const src = String(node.attrs.src || "");
    return [
      "div",
      { "data-youtube-video": "", "data-url": String(node.attrs.url || ""), class: "video-embed" },
      [
        "iframe",
        {
          src,
          title: "YouTube video",
          loading: "lazy",
          allow:
            "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
          allowfullscreen: "true",
          frameborder: "0",
        },
      ],
    ];
  },
});

/** A highlighted content block, e.g. info / warning / success / error. */
const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      variant: { default: "info", rendered: false },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-callout]",
        getAttrs: (dom) => ({
          variant: (dom as HTMLElement).getAttribute("data-callout") || "info",
        }),
      },
    ];
  },

  renderHTML({ node }) {
    const variant = String(node.attrs.variant || "info");
    return ["div", { "data-callout": variant, class: `callout callout-${variant}` }, 0];
  },
});

/** A standalone call-to-action button/link. */
const ButtonNode = Node.create({
  name: "button",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      href: { default: "#", rendered: false },
      label: { default: "Learn more", rendered: false },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-cta-button]",
        getAttrs: (dom) => {
          const anchor = (dom as HTMLElement).querySelector("a");
          return {
            href: anchor?.getAttribute("href") || "#",
            label: anchor?.textContent || "Learn more",
          };
        },
      },
    ];
  },

  renderHTML({ node }) {
    const href = String(node.attrs.href || "#");
    const label = String(node.attrs.label || "Learn more");
    return [
      "div",
      { "data-cta-button": "", class: "content-button-block" },
      ["a", mergeAttributes({ href, class: "content-button", contenteditable: "false" }), label],
    ];
  },
});

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={active ? "is-active" : ""}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function Toolbar({
  editor,
  fullscreen,
  onToggleFullscreen,
  onRequestMedia,
  onRequestAiImage,
  aiGenerating,
}: {
  editor: Editor;
  fullscreen: boolean;
  onToggleFullscreen: () => void;
  onRequestMedia?: (insert: (src: string, alt?: string) => void) => void;
  onRequestAiImage?: () => void;
  aiGenerating?: boolean;
}) {
  function insertLink() {
    const previousHref = (editor.getAttributes("link").href as string | undefined) || "";
    const href = window.prompt("Link URL", previousHref || "https://");
    if (href === null) return;
    if (!href.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    const openInNewTab = window.confirm("Open this link in a new tab?");
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({
        href: href.trim(),
        target: openInNewTab ? "_blank" : null,
        rel: openInNewTab ? "noopener noreferrer" : null,
      })
      .run();
  }

  function insertImage() {
    if (onRequestMedia) {
      onRequestMedia((src, alt) => {
        if (!src?.trim()) return;
        editor.chain().focus().setImage({ src: src.trim(), alt: alt || "" }).run();
      });
      return;
    }
    const src = window.prompt("Image URL");
    if (!src || !src.trim()) return;
    const alt = window.prompt("Alt text (for accessibility)", "") || "";
    editor.chain().focus().setImage({ src: src.trim(), alt }).run();
  }

  function insertYoutube() {
    const raw = window.prompt("YouTube video URL");
    if (!raw || !raw.trim()) return;
    const embed = youtubeEmbedUrl(raw.trim());
    if (!embed) {
      window.alert("That doesn't look like a valid YouTube URL.");
      return;
    }
    editor
      .chain()
      .focus()
      .insertContent({ type: "youtube", attrs: { url: raw.trim(), src: embed } })
      .run();
  }

  function insertCallout() {
    const input = window.prompt("Callout type: info, warning, success, or error", "info");
    if (input === null) return;
    const normalized = input.trim().toLowerCase();
    const variant: CalloutVariant = (CALLOUT_VARIANTS as readonly string[]).includes(normalized)
      ? (normalized as CalloutVariant)
      : "info";
    editor.chain().focus().wrapIn("callout", { variant }).run();
  }

  function insertButtonCta() {
    const href = window.prompt("Button link URL", "https://");
    if (!href || !href.trim()) return;
    const label = window.prompt("Button label", "Learn more") || "Learn more";
    editor
      .chain()
      .focus()
      .insertContent({ type: "button", attrs: { href: href.trim(), label } })
      .run();
  }

  const codeBlockActive = editor.isActive("codeBlock");
  const currentLanguage = (editor.getAttributes("codeBlock").language as string) || "plaintext";

  return (
    <div className="rich-editor-toolbar" role="toolbar" aria-label="Formatting">
      <div className="rich-editor-toolbar-group">
        <ToolbarButton title="Undo" onClick={() => editor.chain().focus().undo().run()}>
          ↶
        </ToolbarButton>
        <ToolbarButton title="Redo" onClick={() => editor.chain().focus().redo().run()}>
          ↷
        </ToolbarButton>
      </div>

      <div className="rich-editor-toolbar-group">
        <select
          title="Paragraph style"
          value={
            [1, 2, 3, 4, 5, 6].find((level) => editor.isActive("heading", { level }))
              ? String([1, 2, 3, 4, 5, 6].find((level) => editor.isActive("heading", { level })))
              : "paragraph"
          }
          onChange={(event) => {
            const { value } = event.target;
            if (value === "paragraph") {
              editor.chain().focus().setParagraph().run();
              return;
            }
            editor
              .chain()
              .focus()
              .toggleHeading({ level: Number(value) as 1 | 2 | 3 | 4 | 5 | 6 })
              .run();
          }}
        >
          <option value="paragraph">Paragraph</option>
          <option value="1">Heading 1</option>
          <option value="2">Heading 2</option>
          <option value="3">Heading 3</option>
          <option value="4">Heading 4</option>
          <option value="5">Heading 5</option>
          <option value="6">Heading 6</option>
        </select>
      </div>

      <div className="rich-editor-toolbar-group">
        <ToolbarButton
          title="Bold"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton
          title="Italic"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton
          title="Underline"
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <span style={{ textDecoration: "underline" }}>U</span>
        </ToolbarButton>
        <ToolbarButton
          title="Strikethrough"
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <span style={{ textDecoration: "line-through" }}>S</span>
        </ToolbarButton>
      </div>

      <div className="rich-editor-toolbar-group">
        <ToolbarButton
          title="Align left"
          active={editor.isActive({ textAlign: "left" })}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
        >
          ⇤
        </ToolbarButton>
        <ToolbarButton
          title="Align center"
          active={editor.isActive({ textAlign: "center" })}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
        >
          ⇔
        </ToolbarButton>
        <ToolbarButton
          title="Align right"
          active={editor.isActive({ textAlign: "right" })}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
        >
          ⇥
        </ToolbarButton>
        <ToolbarButton
          title="Justify"
          active={editor.isActive({ textAlign: "justify" })}
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        >
          ≡
        </ToolbarButton>
      </div>

      <div className="rich-editor-toolbar-group">
        <ToolbarButton
          title="Bullet list"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          • ⋮
        </ToolbarButton>
        <ToolbarButton
          title="Ordered list"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          1. ⋮
        </ToolbarButton>
        <ToolbarButton
          title="Task list"
          active={editor.isActive("taskList")}
          onClick={() => editor.chain().focus().toggleTaskList().run()}
        >
          ☑
        </ToolbarButton>
      </div>

      <div className="rich-editor-toolbar-group">
        <ToolbarButton
          title="Blockquote"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          ❝
        </ToolbarButton>
        <ToolbarButton title="Horizontal rule" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          ―
        </ToolbarButton>
      </div>

      <div className="rich-editor-toolbar-group">
        <ToolbarButton
          title="Code block"
          active={codeBlockActive}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          {"</>"}
        </ToolbarButton>
        {codeBlockActive && (
          <select
            title="Code language"
            value={currentLanguage}
            onChange={(event) =>
              editor.chain().focus().updateAttributes("codeBlock", { language: event.target.value }).run()
            }
          >
            {CODE_LANGUAGES.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="rich-editor-toolbar-group">
        <ToolbarButton title="Link" active={editor.isActive("link")} onClick={insertLink}>
          🔗
        </ToolbarButton>
        <ToolbarButton title="Image from library" onClick={insertImage}>
          🖼
        </ToolbarButton>
        {onRequestAiImage ? (
          <ToolbarButton
            title="Generate image with AI"
            onClick={onRequestAiImage}
            disabled={aiGenerating}
          >
            {aiGenerating ? "…" : "✦ AI"}
          </ToolbarButton>
        ) : null}
        <ToolbarButton title="YouTube video" onClick={insertYoutube}>
          ▶
        </ToolbarButton>
        <ToolbarButton title="Callout" active={editor.isActive("callout")} onClick={insertCallout}>
          ℹ
        </ToolbarButton>
        <ToolbarButton title="Button / CTA" onClick={insertButtonCta}>
          ⛶
        </ToolbarButton>
        <ToolbarButton
          title="Insert table"
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        >
          ⊞
        </ToolbarButton>
      </div>

      <div className="rich-editor-toolbar-group">
        <ToolbarButton title={fullscreen ? "Exit fullscreen" : "Fullscreen"} active={fullscreen} onClick={onToggleFullscreen}>
          {fullscreen ? "⤢" : "⤡"}
        </ToolbarButton>
      </div>
    </div>
  );
}

export function RichTextEditor({
  initialContent,
  onChange,
  placeholder,
  dir,
  locale,
  onRequestMedia,
}: Props) {
  const [fullscreen, setFullscreen] = useState(false);
  const [aiPromptOpen, setAiPromptOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiAlt, setAiAlt] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState("");
  const insertPosRef = useRef<number | null>(null);
  const resolvedDir: "rtl" | "ltr" = dir || (locale === "ar" ? "rtl" : "ltr");

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3, 4, 5, 6] },
          link: false,
          codeBlock: false,
        }),
        TextAlign.configure({
          types: ["heading", "paragraph"],
          alignments: ["left", "center", "right", "justify"],
        }),
        CodeBlockLowlight.configure({ lowlight }),
        Link.configure({
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { rel: "noopener noreferrer" },
        }),
        TiptapImage.configure({ inline: false }),
        TaskList,
        TaskItem.configure({ nested: true }),
        Table.configure({ resizable: true }),
        TableRow,
        TableHeader,
        TableCell,
        Youtube,
        Callout,
        ButtonNode,
        CharacterCount,
        Placeholder.configure({
          placeholder: placeholder || "Write your post…",
        }),
      ],
      content: initialContent || { type: "doc", content: [{ type: "paragraph" }] },
      immediatelyRender: false,
      editorProps: {
        attributes: {
          dir: resolvedDir,
        },
      },
      onUpdate: ({ editor: current }) => {
        onChange?.(current.getJSON() as Record<string, unknown>);
      },
    },
    [resolvedDir],
  );

  useEffect(() => {
    if (!editor || !initialContent) return;
    const current = JSON.stringify(editor.getJSON());
    const next = JSON.stringify(initialContent);
    if (current !== next) editor.commands.setContent(initialContent);
  }, [editor, initialContent]);

  if (!editor) return null;
  const activeEditor = editor;

  const characters = activeEditor.storage.characterCount?.characters?.() ?? 0;
  const words = activeEditor.storage.characterCount?.words?.() ?? 0;

  function openAiImagePrompt() {
    insertPosRef.current = activeEditor.state.selection.from;
    setAiError("");
    setAiPrompt("");
    setAiAlt("");
    setAiPromptOpen(true);
  }

  async function generateAiImage() {
    const prompt = aiPrompt.trim();
    if (!prompt) {
      setAiError("Enter a prompt describing the image.");
      return;
    }
    setAiGenerating(true);
    setAiError("");
    try {
      const res = await firebaseAuthorizedFetch("/api/cms/ai-image", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt,
          alt: aiAlt.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to generate image.");
      const url = String(data.asset?.url || "");
      const alt = String(data.asset?.alt || aiAlt.trim() || prompt);
      if (!url) throw new Error("Generation returned no image URL.");

      const pos = insertPosRef.current ?? activeEditor.state.selection.from;
      activeEditor
        .chain()
        .focus()
        .insertContentAt(pos, {
          type: "image",
          attrs: { src: url, alt },
        })
        .run();
      setAiPromptOpen(false);
      setAiPrompt("");
      setAiAlt("");
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "Unable to generate image.");
    } finally {
      setAiGenerating(false);
    }
  }

  return (
    <div
      className={`rich-editor${fullscreen ? " rich-editor-fullscreen" : ""}`}
      dir={resolvedDir}
      style={{
        fontFamily: resolvedDir === "rtl" ? "var(--font-cairo)" : "var(--font-inter, Inter, sans-serif)",
      }}
    >
      <Toolbar
        editor={activeEditor}
        fullscreen={fullscreen}
        onToggleFullscreen={() => setFullscreen((value) => !value)}
        onRequestMedia={onRequestMedia}
        onRequestAiImage={openAiImagePrompt}
        aiGenerating={aiGenerating}
      />
      <EditorContent editor={activeEditor} className="rich-editor-surface" />
      <div className="rich-editor-footer">
        <span>{characters} characters</span>
        <span>{words} words</span>
      </div>

      {aiPromptOpen ? (
        <div className="ai-image-modal" role="dialog" aria-modal="true" aria-label="Generate AI image">
          <button
            type="button"
            className="ai-image-backdrop"
            aria-label="Close"
            disabled={aiGenerating}
            onClick={() => {
              if (!aiGenerating) setAiPromptOpen(false);
            }}
          />
          <div className="ai-image-panel">
            <header className="ai-image-head">
              <div>
                <p className="micro-label">AI image</p>
                <h3>Generate image</h3>
              </div>
              <button
                type="button"
                className="btn-secondary"
                disabled={aiGenerating}
                onClick={() => setAiPromptOpen(false)}
              >
                Close
              </button>
            </header>
            <p className="ai-image-lead">
              Describe the image. It will be generated in 16:9, uploaded to media, and inserted at the
              cursor.
            </p>
            <label className="ai-image-field">
              Prompt
              <textarea
                rows={4}
                value={aiPrompt}
                disabled={aiGenerating}
                autoFocus
                placeholder="e.g. A clean isometric illustration of a Raspberry Pi with sensors on a desk…"
                onChange={(event) => setAiPrompt(event.target.value)}
              />
            </label>
            <label className="ai-image-field">
              Alt text (optional)
              <input
                value={aiAlt}
                disabled={aiGenerating}
                placeholder="Short description for accessibility"
                onChange={(event) => setAiAlt(event.target.value)}
              />
            </label>
            {aiError ? <p className="ai-image-error">{aiError}</p> : null}
            <div className="ai-image-actions">
              <button
                type="button"
                className="btn-secondary"
                disabled={aiGenerating}
                onClick={() => setAiPromptOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={aiGenerating || !aiPrompt.trim()}
                onClick={() => void generateAiImage()}
              >
                {aiGenerating ? "Generating…" : "Generate & insert"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
