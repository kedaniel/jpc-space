import type { ReactNode } from "react";

import { RoleLayout } from "@/components/layout/role-layout";

export default function MentorLayout({ children }: { children: ReactNode }) {
  return (
    <RoleLayout allowedRoles={["SUPER", "MENTOR"]}>{children}</RoleLayout>
  );
}
