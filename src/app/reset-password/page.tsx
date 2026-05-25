import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/ui/logo";
import { resetPassword } from "@/lib/auth/password-reset";

export const metadata = { title: "Reset password — JPC Space" };

async function resetAction(formData: FormData) {
  "use server";
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  try {
    await resetPassword(token, password);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not reset password.";
    redirect(
      `/reset-password?token=${encodeURIComponent(token)}&error=${encodeURIComponent(msg)}`,
    );
  }
  redirect("/login?reset=1");
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const params = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-border/60 bg-card/90 p-6 shadow-[var(--shadow-pop)] backdrop-blur-md md:p-8">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <Logo size="lg" />
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Reset password
            </h1>
            <p className="text-sm text-muted-foreground">
              Choose a new password — at least 8 characters.
            </p>
          </div>
        </div>
        {params.error ? (
          <p className="mb-4 rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-700 dark:border-error-900 dark:bg-error-950 dark:text-error-200">
            {params.error}
          </p>
        ) : null}
        <form action={resetAction} className="flex flex-col gap-4">
          <input type="hidden" name="token" value={params.token ?? ""} />
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">New password</span>
            <Input
              name="password"
              type="password"
              required
              minLength={8}
              size="lg"
            />
          </label>
          <Button type="submit" size="lg" className="w-full">
            Set new password
          </Button>
        </form>
      </div>
    </main>
  );
}
