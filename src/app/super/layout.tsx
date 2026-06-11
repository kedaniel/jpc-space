import type { ReactNode } from "react";

import { RoleLayout } from "@/components/layout/role-layout";

export default function SuperLayout({ children }: { children: ReactNode }) {
  return (
    <RoleLayout allowedRoles={["SUPER"]}>
      <div className="-mx-4 -mt-4 bg-brand-navy-50 px-4 pt-4 pb-24 md:-mx-8 md:-mt-8 md:px-8 md:pt-8 md:pb-10">
        {children}
      </div>
    </RoleLayout>
  );
}
