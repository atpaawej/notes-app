import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="min-h-svh flex flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          404
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Page not found
        </h1>
        <p className="text-sm text-muted-foreground">
          The page you are looking for does not exist or has moved.
        </p>
      </div>
      <Button asChild>
        <Link href="/">Back home</Link>
      </Button>
    </main>
  );
}