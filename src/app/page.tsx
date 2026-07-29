import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { dashboardPathForRole } from "@/lib/auth/post-login";

export default async function HomePage() {
  const session = await auth();
  if (session?.user?.role) {
    redirect(dashboardPathForRole(session.user.role, session.user.graduationYear ?? null));
  }
  redirect("/login");
}
