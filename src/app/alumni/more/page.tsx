import { redirect } from "next/navigation";

import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { isAlumnus } from "@/lib/rbac";
import { MoreMenu } from "@/components/layout/more-menu";

export const metadata = { title: "More" };

export default async function AlumniMorePage() {
  const user = await getCurrentUserOrRedirect();
  if (!isAlumnus(user)) redirect("/login");
  return <MoreMenu user={user} />;
}
