"use client";

import * as React from "react";
import { Camera } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { updateAvatarAction } from "@/lib/user-actions";

interface AvatarUploadProps {
  currentAvatarUrl: string | null;
  initials: string;
}

export function AvatarUpload({ currentAvatarUrl, initials }: AvatarUploadProps) {
  const [preview, setPreview] = React.useState<string | null>(currentAvatarUrl);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Must be JPEG, PNG, or WebP");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("File must be under 5 MB");
      return;
    }
    setError(null);
    setPreview(URL.createObjectURL(file));
    handleUpload(file);
  }

  async function handleUpload(file: File) {
    setPending(true);
    const fd = new FormData();
    fd.append("avatar", file);
    const result = await updateAvatarAction(fd);
    setPending(false);
    if (result && "error" in result) setError(result.error ?? "Upload failed");
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <Avatar size="xl">
          {preview && <AvatarImage src={preview} alt="Profile photo" />}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        {pending && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
            <span className="text-xs text-white">Saving…</span>
          </div>
        )}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={pending}
      >
        <Camera className="size-4 mr-1.5" />
        Upload photo
      </Button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleFileChange}
      />

      {error && <p className="text-xs text-error-500">{error}</p>}
    </div>
  );
}
