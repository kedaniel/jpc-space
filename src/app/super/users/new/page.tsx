import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { Card, CardContent } from "@/components/ui/card";
import { UserForm } from "@/components/users/user-form";

export const metadata = { title: "New user" };

export default async function NewUserPage() {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["SUPER"]);
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-black text-brand-navy-900">New user</h1>
        <p className="mt-1 text-sm text-neutral-500">Create a user account.</p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <UserForm mode="create" />
        </CardContent>
      </Card>
    </div>
  );
}
