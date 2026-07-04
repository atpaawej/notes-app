"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/auth-provider";

export function SignInButton() {
  const { signInWithGoogle, loading } = useAuth();
  const [pending, setPending] = React.useState(false);

  return (
    <Button
      size="lg"
      disabled={pending || loading}
      onClick={async () => {
        setPending(true);
        try {
          await signInWithGoogle();
        } catch {
          // error surfaced via toast inside the provider
        } finally {
          setPending(false);
        }
      }}
    >
      {pending ? (
        <>
          <Loader2 className="animate-spin" />
          Signing in…
        </>
      ) : (
        <>
          <GoogleIcon className="size-4" />
          Sign in with Google
        </>
      )}
    </Button>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.1A6.94 6.94 0 0 1 5.49 12c0-.73.13-1.43.35-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.77.43 3.44 1.18 4.93l3.66-2.83Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38Z"
        fill="#EA4335"
      />
    </svg>
  );
}