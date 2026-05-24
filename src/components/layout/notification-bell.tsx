"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { Bell, BellOff } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface NotificationBellItem {
  id: number;
  title: string;
  body: string | null;
  link: string | null;
  readAt: Date | null;
  createdAt: Date;
}

export interface NotificationBellProps {
  items: NotificationBellItem[];
  unread: number;
  viewAllHref: string;
  onMarkAllRead: () => Promise<void>;
}

export function NotificationBell({
  items,
  unread,
  viewAllHref,
  onMarkAllRead,
}: NotificationBellProps) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const router = useRouter();

  function markAll() {
    startTransition(async () => {
      await onMarkAllRead();
      router.refresh();
    });
  }

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
        className="relative inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
      >
        <Bell className="size-5" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-error-500 px-1 text-[10px] font-semibold leading-none text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Positioner sideOffset={6} align="end" className="z-50">
          <PopoverPrimitive.Popup className="w-[min(20rem,calc(100vw-1rem))] overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md outline-none">
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <span className="text-sm font-semibold">Notifications</span>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={markAll}
                disabled={pending || unread === 0}
              >
                Mark all read
              </Button>
            </div>
            <ul className="max-h-80 divide-y divide-border overflow-auto">
              {items.length === 0 ? (
                <li className="flex flex-col items-center gap-2 px-3 py-8 text-center text-sm text-muted-foreground">
                  <BellOff className="size-5" />
                  No notifications yet.
                </li>
              ) : (
                items.map((n) => (
                  <li key={n.id}>
                    <NotificationRow item={n} onSelect={() => setOpen(false)} />
                  </li>
                ))
              )}
            </ul>
            <div className="border-t border-border px-3 py-2 text-right">
              <Link
                href={viewAllHref}
                onClick={() => setOpen(false)}
                className="text-sm font-medium text-brand-teal-700 hover:underline"
              >
                View all
              </Link>
            </div>
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

function NotificationRow({
  item,
  onSelect,
}: {
  item: NotificationBellItem;
  onSelect: () => void;
}) {
  const inner = (
    <div
      className={cn(
        "flex flex-col gap-1 px-3 py-2.5 text-sm",
        !item.readAt && "bg-info-50",
      )}
    >
      <div className="flex items-start gap-2">
        {!item.readAt && (
          <span className="mt-1.5 inline-block size-1.5 shrink-0 rounded-full bg-info-500" />
        )}
        <span className="flex-1 font-medium leading-snug">{item.title}</span>
      </div>
      {item.body && (
        <span className="text-xs text-muted-foreground">{item.body}</span>
      )}
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {formatDistanceToNow(item.createdAt, { addSuffix: true })}
      </span>
    </div>
  );
  if (item.link) {
    return (
      <Link href={item.link} onClick={onSelect} className="block hover:bg-muted/60">
        {inner}
      </Link>
    );
  }
  return inner;
}

// Allow consumers to render an offline-safe placeholder while the bell loads.
export function NotificationBellSkeleton() {
  return (
    <span className="inline-flex size-9 items-center justify-center text-muted-foreground">
      <Bell className="size-5 opacity-40" />
    </span>
  );
}

// Re-export Badge so callers (e.g. design-system showcase) can render the bell + a Badge nearby.
export { Badge as _BadgePassthrough };
