import type { SessionUser } from "@/lib/rbac";
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
    <>
      {children}
    </>
  );
}
