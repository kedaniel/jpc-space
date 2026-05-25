import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { UserForm } from "@/components/users/user-form";

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
    select: { id: true, name: true, email: true, role: true, deletedAt: true },
  });
  if (!target) notFound();

  return (
    <>
      <PageHeader
        title={`Edit ${target.name ?? target.email}`}
        description={target.email}
      />
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
            }}
          />
        </CardContent>
      </Card>
    </>
  );
}
