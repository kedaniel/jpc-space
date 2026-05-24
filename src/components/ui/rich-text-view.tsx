import DOMPurify from "isomorphic-dompurify";

import { cn } from "@/lib/utils";

export interface RichTextViewProps {
  html: string | null | undefined;
  className?: string;
  emptyText?: string;
}

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "em",
  "s",
  "a",
  "ul",
  "ol",
  "li",
  "h2",
  "h3",
  "blockquote",
  "code",
  "pre",
];

const ALLOWED_ATTR = ["href", "target", "rel"];

export function RichTextView({ html, className, emptyText }: RichTextViewProps) {
  if (!html || html.trim() === "" || html === "<p></p>") {
    if (!emptyText) return null;
    return (
      <p className={cn("text-sm italic text-muted-foreground", className)}>
        {emptyText}
      </p>
    );
  }
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  });
  return (
    <div
      className={cn(
        "prose prose-sm max-w-none text-sm prose-headings:font-semibold prose-a:text-brand-teal-700",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
