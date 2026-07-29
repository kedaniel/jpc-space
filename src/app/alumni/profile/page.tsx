import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { isAlumnus } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Profile" };

export default async function AlumniProfilePage() {
  const user = await getCurrentUserOrRedirect();
  if (!isAlumnus(user)) redirect("/login");

  const account = await db.user.findUnique({
    where: { id: user.userId },
    select: {
      name: true,
      email: true,
      graduationYear: true,
      studentProfile: { select: { university: true, year: true } },
    },
  });

  return (
    <div className="flex flex-col gap-3 md:gap-4">
      <div>
        <h1 className="text-2xl font-black text-brand-navy-900 dark:text-foreground">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your alumni record</p>
      </div>
      <Card>
        <CardContent className="grid grid-cols-1 gap-3 pt-6 md:grid-cols-2">
          <Field label="Name" value={account?.name ?? null} />
          <Field label="Email" value={account?.email ?? null} />
          <Field
            label="Status"
            value={account?.graduationYear ? `Alumnus · Class of ${account.graduationYear}` : null}
            badge
          />
          <Field label="University" value={account?.studentProfile?.university ?? null} />
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">
        To update your details, please contact the JPC team.
      </p>
    </div>
  );
}

function Field({ label, value, badge }: { label: string; value: string | null; badge?: boolean }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      {value ? (
        badge ? (
          <Badge variant="success" className="mt-1">{value}</Badge>
        ) : (
          <p className="mt-1 text-sm text-foreground">{value}</p>
        )
      ) : (
        <p className="mt-1 text-sm italic text-muted-foreground">—</p>
      )}
    </div>
  );
}
