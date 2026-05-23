"use client";

import * as React from "react";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { LogOut } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
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
  signOutAction: () => Promise<void>;
}

function UserMenu({ role, userId, initials, signOutAction }: UserMenuProps) {
  return (
    <MenuPrimitive.Root>
      <MenuPrimitive.Trigger
        className={cn(
          "inline-flex items-center gap-2 rounded-full p-0.5 outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/40"
        )}
        aria-label="User menu"
      >
        <Avatar size="md">
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
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
            <form action={signOutAction}>
              <MenuPrimitive.Item
                render={
                  <button
                    type="submit"
                    className={cn(
                      "flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
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
    </MenuPrimitive.Root>
  );
}

export { UserMenu };
