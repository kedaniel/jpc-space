import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { dashboardPathForRole } from "@/lib/auth/post-login";
import { Logo } from "@/components/ui/logo";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in — JPC Space" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;
  if (session?.user?.role) {
    redirect(params.callbackUrl ?? dashboardPathForRole(session.user.role));
  }
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-border/60 bg-card/90 p-6 shadow-[var(--shadow-pop)] backdrop-blur-md md:p-8">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <Logo size="lg" />
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Welcome back
            </h1>
            <p className="text-sm text-muted-foreground">
              Sign in to JPC Space to continue.
            </p>
          </div>
        </div>
        <LoginForm callbackUrl={params.callbackUrl} />
      </div>
    </main>
  );
}
