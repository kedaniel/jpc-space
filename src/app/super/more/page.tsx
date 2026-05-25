import { getCurrentUserOrRedirect } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/permissions";
import { MoreMenu } from "@/components/layout/more-menu";

export const metadata = { title: "More" };

export default async function SuperMorePage() {
  const user = await getCurrentUserOrRedirect();
  requireRole(user, ["SUPER"]);
  return <MoreMenu user={user} />;
}
