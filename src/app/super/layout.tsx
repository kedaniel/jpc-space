import type { ReactNode } from "react";

import { RoleLayout } from "@/components/layout/role-layout";

export default function SuperLayout({ children }: { children: ReactNode }) {
  return <RoleLayout allowedRoles={["SUPER"]}>{children}</RoleLayout>;
}
