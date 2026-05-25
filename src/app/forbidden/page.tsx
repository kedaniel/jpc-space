import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { signOut } from "@/lib/auth";

export const metadata = { title: "Forbidden — JPC Space" };

async function signOutAction() {
  "use server";
  await signOut({ redirectTo: "/login" });
}

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-border/60 bg-card/90 p-6 shadow-[var(--shadow-pop)] backdrop-blur-md md:p-8">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <Logo size="lg" />
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              You&apos;re not on this list
            </h1>
            <p className="text-sm text-muted-foreground">
              Your current role doesn&apos;t have access to that page. Try a
              different section, or sign in with another account.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Button render={<Link href="/" />} size="lg" className="w-full">
            Back home
          </Button>
          <form action={signOutAction}>
            <Button
              type="submit"
              variant="outline"
              size="lg"
              className="w-full"
            >
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
