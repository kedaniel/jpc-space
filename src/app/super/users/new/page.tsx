import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { UserForm } from "@/components/users/user-form";

export const metadata = { title: "New user" };

export default async function NewUserPage() {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["SUPER"]);
  return (
    <>
      <PageHeader title="New user" description="Create a user account." />
      <Card>
        <CardContent className="pt-6">
          <UserForm mode="create" />
        </CardContent>
      </Card>
    </>
  );
}
