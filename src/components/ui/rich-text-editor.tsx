"use client";

import * as React from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import {
  Bold,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Strikethrough,
  Undo2,
  Redo2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
  id?: string;
  "aria-describedby"?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write something…",
  disabled,
  invalid,
  className,
  id,
  "aria-describedby": ariaDescribedBy,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
    ],
    content: value || "",
    editable: !disabled,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        id: id ?? "",
        "aria-describedby": ariaDescribedBy ?? "",
        "aria-invalid": invalid ? "true" : "false",
        class: cn(
          "prose prose-sm max-w-none min-h-32 px-3 py-2 outline-none text-sm",
          "prose-headings:font-semibold prose-a:text-brand-teal-700",
        ),
      },
    },
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
  });

  React.useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) {
    return (
      <div
        className={cn(
          "min-h-32 rounded-md border border-input bg-background",
          className,
        )}
      />
    );
  }

  function setLink() {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL", prev ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  }

  const isEmpty = editor.isEmpty;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md border border-input bg-background transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/40",
        invalid &&
          "border-destructive ring-3 ring-destructive/20",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-neutral-50 px-1.5 py-1">
        <ToolbarButton
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          label="Bold"
        >
          <Bold className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          label="Italic"
        >
          <Italic className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          label="Strikethrough"
        >
          <Strikethrough className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          label="Bullet list"
        >
          <List className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          label="Numbered list"
        >
          <ListOrdered className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("link")}
          onClick={setLink}
          label="Link"
        >
          <LinkIcon className="size-4" />
        </ToolbarButton>
        <div className="ml-auto flex gap-0.5">
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            label="Undo"
            disabled={!editor.can().undo()}
          >
            <Undo2 className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            label="Redo"
            disabled={!editor.can().redo()}
          >
            <Redo2 className="size-4" />
          </ToolbarButton>
        </div>
      </div>
      <div className="relative">
        {isEmpty && (
          <span className="pointer-events-none absolute left-3 top-2 text-sm text-muted-foreground">
            {placeholder}
          </span>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  label,
  children,
}: ToolbarButtonProps) {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="icon-sm"
      aria-label={label}
      aria-pressed={active || undefined}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </Button>
  );
}
