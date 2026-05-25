import type { ReactNode } from "react";

import { RoleLayout } from "@/components/layout/role-layout";

export default function LeaderLayout({ children }: { children: ReactNode }) {
  return (
    <RoleLayout allowedRoles={["SUPER", "ADMIN", "LEADER"]}>
      {children}
    </RoleLayout>
  );
}
