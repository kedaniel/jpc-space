"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { Camera, LogOut } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { updateAvatarAction } from "@/lib/user-actions";
import type { UserRole } from "@/generated/prisma/enums";

type RoleColor = "super" | "admin" | "leader" | "mentor" | "student";
const roleColor: Record<UserRole, RoleColor> = {
  SUPER: "super",
  ADMIN: "admin",
  LEADER: "leader",
  MENTOR: "mentor",
  STUDENT: "student",
};

interface UserMenuProps {
  role: UserRole;
  userId: number;
  initials: string;
  avatarUrl?: string | null;
  signOutAction: () => Promise<void>;
}

function UserMenu({ role, userId, initials, avatarUrl, signOutAction }: UserMenuProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(avatarUrl ?? null);
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setPreview(URL.createObjectURL(file));
    const fd = new FormData();
    fd.append("avatar", file);
    await updateAvatarAction(fd);
    setUploading(false);
    router.refresh();
  }

  return (
    <MenuPrimitive.Root>
      <MenuPrimitive.Trigger
        className={cn(
          "relative inline-flex items-center gap-2 rounded-full p-0.5 outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/40"
        )}
        aria-label="User menu"
      >
        <Avatar size="md">
          {preview && <AvatarImage src={preview} alt="Your photo" />}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        {uploading && (
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-[10px] text-white">
            …
          </span>
        )}
      </MenuPrimitive.Trigger>
      <MenuPrimitive.Portal>
        <MenuPrimitive.Positioner sideOffset={8} align="end" className="z-50">
          <MenuPrimitive.Popup
            className={cn(
              "min-w-56 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md outline-none"
            )}
          >
            <div className="flex flex-col gap-1 px-2 py-2">
              <span className="text-xs text-muted-foreground">
                User #{userId}
              </span>
              <Badge role={roleColor[role]} className="w-fit">
                {role}
              </Badge>
            </div>
            <MenuPrimitive.Separator className="my-1 h-px bg-border" />
            <MenuPrimitive.Item
              render={
                <button
                  type="button"
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
                  )}
                  onClick={() => fileInputRef.current?.click()}
                />
              }
            >
              <Camera className="size-4" />
              Change photo
            </MenuPrimitive.Item>
            <MenuPrimitive.Separator className="my-1 h-px bg-border" />
            <form action={signOutAction}>
              <MenuPrimitive.Item
                render={
                  <button
                    type="submit"
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
                    )}
                  />
                }
              >
                <LogOut className="size-4" />
                Sign out
              </MenuPrimitive.Item>
            </form>
          </MenuPrimitive.Popup>
        </MenuPrimitive.Positioner>
      </MenuPrimitive.Portal>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleFileChange}
      />
    </MenuPrimitive.Root>
  );
}

export { UserMenu };
