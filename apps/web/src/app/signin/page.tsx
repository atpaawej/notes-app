import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthProvider } from "@/components/auth/auth-provider";
import { SignInButton } from "@/components/auth/sign-in-button";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata = {
  title: "Sign in · Notes",
};

export default async function SignInPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <AuthProvider>
      <main className="min-h-svh flex flex-col bg-background">
        <header className="px-6 py-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium tracking-tight text-foreground"
          >
            <span className="flex size-7 items-center justify-center rounded-md border border-border bg-card">
              <NotesLogo />
            </span>
            Notes
          </Link>
        </header>

        <div className="flex flex-1 items-center justify-center px-6 pb-16">
          <div className="w-full max-w-sm space-y-8 text-center">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                Sign in to Notes
              </h1>
              <p className="text-sm text-muted-foreground text-balance">
                Use the Google account you want associated with your notes.
                You will be redirected back here once it is set up.
              </p>
            </div>

            <div className="flex justify-center pt-2">
              <SignInButton />
            </div>

            <p className="text-xs text-muted-foreground">
              By signing in you agree that you are fine with how the app
              handles your data.{" "}
              <Link
                href="/"
                className="underline-offset-4 hover:text-foreground hover:underline"
              >
                Read the details on the home page
              </Link>
              .
            </p>
          </div>
        </div>
      </main>
    </AuthProvider>
  );
}

function NotesLogo() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
      aria-hidden="true"
    >
      <path d="M4 4h12l4 4v12a2 2 0 0 1-2 2H4Z" />
      <path d="M8 9h8" />
      <path d="M8 13h8" />
      <path d="M8 17h5" />
    </svg>
  );
}