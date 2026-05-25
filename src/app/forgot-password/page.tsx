import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/ui/logo";
import { requestPasswordReset } from "@/lib/auth/password-reset";

export const metadata = { title: "Forgot password — JPC Space" };

async function forgotAction(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").trim();
  if (email) await requestPasswordReset(email);
  redirect("/forgot-password?sent=1");
}

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const params = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-border/60 bg-card/90 p-6 shadow-[var(--shadow-pop)] backdrop-blur-md md:p-8">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <Logo size="lg" />
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Forgot password
            </h1>
            <p className="text-sm text-muted-foreground">
              We&apos;ll email you a reset link. In development, look for the
              link in the server console.
            </p>
          </div>
        </div>
        {params.sent ? (
          <p className="mb-4 rounded-lg border border-success-200 bg-success-50 px-3 py-2 text-sm text-success-700 dark:border-success-900 dark:bg-success-950 dark:text-success-200">
            If an account exists for that email, a reset link has been sent.
          </p>
        ) : null}
        <form action={forgotAction} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">Email</span>
            <Input name="email" type="email" required size="lg" />
          </label>
          <Button type="submit" size="lg" className="w-full">
            Send reset link
          </Button>
        </form>
      </div>
    </main>
  );
}
