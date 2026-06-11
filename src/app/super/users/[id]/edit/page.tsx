import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
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
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-black text-brand-navy-900">Edit {target.name ?? target.email}</h1>
        <p className="mt-1 text-sm text-neutral-500">{target.email}</p>
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
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
