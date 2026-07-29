import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { Card, CardContent } from "@/components/ui/card";
import { UserForm } from "@/components/users/user-form";
import { SendInviteButton } from "@/components/users/invite-buttons";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata = { title: "Edit user" };

export default async function EditUserPage({ params }: PageProps) {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["SUPER"]);
  const { id } = await params;
  const target = await db.user.findUnique({
    where: { id: Number(id) },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      graduationYear: true,
      deletedAt: true,
      passwordHash: true,
      lastLoginAt: true,
    },
  });
  if (!target) notFound();

  const activated = target.passwordHash !== null || target.lastLoginAt !== null;
  let invitePending = false;
  if (!activated && !target.deletedAt) {
    const token = await db.inviteToken.findFirst({
      where: { userId: target.id, usedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true },
    });
    invitePending = Boolean(token);
  }
  const canInvite = !activated && !target.deletedAt;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-brand-navy-900 dark:text-foreground">Edit {target.name ?? target.email}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{target.email}</p>
        </div>
        {canInvite ? (
          <SendInviteButton userId={target.id} label={invitePending ? "Resend invite" : "Send invite"} />
        ) : null}
      </div>
      <Card>
        <CardContent className="pt-6">
          <UserForm
            mode="edit"
            userId={target.id}
            isInactive={Boolean(target.deletedAt)}
            defaultValues={{
              name: target.name ?? "",
              email: target.email,
              role: target.role,
              graduationYear: target.graduationYear,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
