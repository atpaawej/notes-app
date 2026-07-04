"use server";

import { redirect } from "next/navigation";

import { setSessionCookie, clearSessionCookie } from "@/lib/auth/session";

export type SignInResult = { ok: true } | { ok: false; error: string };

export async function signInWithFirebase(
  idToken: string,
): Promise<SignInResult> {
  try {
    await setSessionCookie(idToken);
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sign-in failed";
    return { ok: false, error: message };
  }
}

export async function signOutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/");
}