import type { SessionUser } from "@/lib/rbac";
import { AppShell } from "@/components/layout/app-shell";

export function DashboardShell({
  user,
  title,
  children,
}: {
  user: SessionUser;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <AppShell user={user} title={title}>
      {children}
    </AppShell>
  );
}
