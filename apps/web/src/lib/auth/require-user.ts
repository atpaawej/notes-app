import "server-only";

import { redirect } from "next/navigation";

import { getCurrentUser, type SessionUser } from "@/lib/auth/session";

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/");
  }
  return user;
}