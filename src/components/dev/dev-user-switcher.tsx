"use client";

import * as React from "react";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { UserCog } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { devSwitchUserAction } from "@/lib/dev/switch-user-action";
import type { UserRole } from "@/generated/prisma/enums";

type RoleColor = "super" | "admin" | "leader" | "mentor" | "student";
const roleColor: Record<UserRole, RoleColor> = {
  SUPER: "super",
  ADMIN: "admin",
  LEADER: "leader",
  MENTOR: "mentor",
  STUDENT: "student",
};

const roleOrder: UserRole[] = ["SUPER", "ADMIN", "LEADER", "MENTOR", "STUDENT"];

export interface DevSwitchUser {
  id: number;
  email: string;
  name: string | null;
  role: UserRole;
}

interface DevUserSwitcherProps {
  users: DevSwitchUser[];
  currentUserId: number;
}

export function DevUserSwitcher({ users, currentUserId }: DevUserSwitcherProps) {
  const [pending, startTransition] = React.useTransition();

  const grouped = React.useMemo(() => {
    const map = new Map<UserRole, DevSwitchUser[]>();
    for (const role of roleOrder) map.set(role, []);
    for (const u of users) map.get(u.role)?.push(u);
    return map;
  }, [users]);

  const handleSwitch = (email: string) => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("email", email);
      await devSwitchUserAction(null, fd);
    });
  };

  return (
    <MenuPrimitive.Root>
      <MenuPrimitive.Trigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Switch user (dev)"
            title="Switch user (dev)"
            disabled={pending}
            className="text-warning-700 dark:text-warning-300"
          >
            <UserCog />
          </Button>
        }
      />
      <MenuPrimitive.Portal>
        <MenuPrimitive.Positioner sideOffset={8} align="end" className="z-50">
          <MenuPrimitive.Popup
            className={cn(
              "max-h-[70vh] w-72 overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md outline-none"
            )}
          >
            <div className="flex items-center justify-between gap-2 px-2 py-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Dev: switch user
              </span>
              <Badge variant="warning">DEV</Badge>
            </div>
            <MenuPrimitive.Separator className="my-1 h-px bg-border" />
            {roleOrder.map((role) => {
              const list = grouped.get(role) ?? [];
              if (list.length === 0) return null;
              return (
                <MenuPrimitive.Group key={role}>
                  <div className="flex items-center gap-2 px-2 pb-1 pt-2">
                    <Badge role={roleColor[role]}>{role}</Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {list.length}
                    </span>
                  </div>
                  {list.map((u) => {
                    const isCurrent = u.id === currentUserId;
                    return (
                      <MenuPrimitive.Item
                        key={u.id}
                        disabled={isCurrent || pending}
                        onClick={() => handleSwitch(u.email)}
                        className={cn(
                          "flex w-full cursor-pointer items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
                          isCurrent && "opacity-60"
                        )}
                      >
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate font-medium">
                            {u.name ?? u.email}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">
                            {u.email}
                          </span>
                        </span>
                        {isCurrent ? (
                          <span className="text-[10px] uppercase text-muted-foreground">
                            current
                          </span>
                        ) : null}
                      </MenuPrimitive.Item>
                    );
                  })}
                </MenuPrimitive.Group>
              );
            })}
          </MenuPrimitive.Popup>
        </MenuPrimitive.Positioner>
      </MenuPrimitive.Portal>
    </MenuPrimitive.Root>
  );
}
