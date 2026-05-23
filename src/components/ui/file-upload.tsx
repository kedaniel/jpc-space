"use client";

import * as React from "react";
import { UploadCloud, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  accept?: string;
  multiple?: boolean;
  maxSizeMb?: number;
  onFilesChange?: (files: File[]) => void;
  className?: string;
}

function FileUpload({
  accept,
  multiple,
  maxSizeMb,
  onFilesChange,
  className,
}: FileUploadProps) {
  const [files, setFiles] = React.useState<File[]>([]);
  const [dragOver, setDragOver] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const accept_attr = accept;

  const updateFiles = (next: File[]) => {
    if (maxSizeMb) {
      const bad = next.find((f) => f.size > maxSizeMb * 1024 * 1024);
      if (bad) {
        setError(`${bad.name} exceeds ${maxSizeMb} MB`);
        return;
      }
    }
    setError(null);
    setFiles(next);
    onFilesChange?.(next);
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const dropped = Array.from(e.dataTransfer.files);
          updateFiles(multiple ? [...files, ...dropped] : dropped.slice(0, 1));
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors",
          dragOver
            ? "border-brand-teal-500 bg-brand-teal-50"
            : "border-neutral-300 bg-neutral-50 hover:border-brand-teal-400 hover:bg-brand-teal-50/50",
          error && "border-error-500 bg-error-50"
        )}
      >
        <UploadCloud
          className={cn(
            "size-8",
            dragOver ? "text-brand-teal-600" : "text-neutral-400"
          )}
        />
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-neutral-900">
            <span className="text-brand-teal-600">Click to upload</span> or drag
            and drop
          </span>
          {maxSizeMb ? (
            <span className="text-xs text-neutral-500">
              Up to {maxSizeMb} MB{accept ? ` · ${accept}` : ""}
            </span>
          ) : null}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={accept_attr}
          multiple={multiple}
          className="sr-only"
          onChange={(e) => {
            const chosen = Array.from(e.target.files ?? []);
            updateFiles(multiple ? [...files, ...chosen] : chosen);
          }}
        />
      </label>

      {error ? <p className="text-xs text-error-600">{error}</p> : null}

      {files.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="flex items-center justify-between gap-2 rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm"
            >
              <span className="truncate text-neutral-900">{f.name}</span>
              <span className="shrink-0 text-xs text-neutral-500 tabular-nums">
                {(f.size / 1024).toFixed(1)} KB
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={`Remove ${f.name}`}
                onClick={() =>
                  updateFiles(files.filter((_, idx) => idx !== i))
                }
              >
                <X />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export { FileUpload };
