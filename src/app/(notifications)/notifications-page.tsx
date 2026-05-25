import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { Bell, BellOff } from "lucide-react";

import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export async function NotificationsPageBody() {
  const user = await getCurrentUserOrRedirect();
  const notifications = await db.notification.findMany({
    where: { userId: user.userId },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      link: true,
      readAt: true,
      createdAt: true,
    },
  });

  return (
    <>
      <PageHeader
        title="Notifications"
        description={`${notifications.filter((n) => !n.readAt).length} unread of ${notifications.length}`}
      />
      {notifications.length === 0 ? (
        <EmptyState
          icon={BellOff}
          title="No notifications"
          description="Activity that involves you will appear here."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {notifications.map((n) => {
            const body = (
              <Card>
                <CardContent
                  className={`flex items-start gap-3 pt-4 ${!n.readAt ? "border-l-4 border-info-500" : ""}`}
                >
                  <Bell className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{n.title}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {n.type.replace(/_/g, " ")}
                      </Badge>
                      {!n.readAt && (
                        <Badge variant="info" className="text-[10px]">
                          New
                        </Badge>
                      )}
                    </div>
                    {n.body && (
                      <p className="text-sm text-muted-foreground">{n.body}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {format(n.createdAt, "MMM d, yyyy آ· h:mm a")} آ·{" "}
                      {formatDistanceToNow(n.createdAt, { addSuffix: true })}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
            return (
              <li key={n.id}>
                {n.link ? (
                  <Link href={n.link} className="block">
                    {body}
                  </Link>
                ) : (
                  body
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
