import "server-only";

import { cookies } from "next/headers";
import { db, services } from "@notes/db";

import {
  SESSION_COOKIE_MAX_AGE_MS,
  SESSION_COOKIE_NAME,
  adminAuth,
} from "@/lib/firebase/admin";

export type SessionUser = {
  id: string;
  firebaseUid: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
};

export async function setSessionCookie(idToken: string): Promise<SessionUser> {
  const decoded = await adminAuth.verifyIdToken(idToken, true);
  if (!decoded.email) {
    throw new Error("Firebase ID token has no email claim");
  }

  const user = await services.findOrCreateUser(db, {
    firebaseUid: decoded.uid,
    email: decoded.email,
    displayName: decoded.name ?? null,
    avatarUrl: decoded.picture ?? null,
  });

  const sessionCookie = await adminAuth.createSessionCookie(idToken, {
    expiresIn: SESSION_COOKIE_MAX_AGE_MS,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_COOKIE_MAX_AGE_MS / 1000,
  });

  return toSessionUser(user);
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (existing) {
    try {
      const decoded = await adminAuth.verifySessionCookie(existing);
      await adminAuth.revokeRefreshTokens(decoded.uid);
    } catch {
      // ignore — cookie already invalid
    }
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!session) return null;

  let decoded;
  try {
    decoded = await adminAuth.verifySessionCookie(session, true);
  } catch {
    return null;
  }

  const user = await services.getUserByFirebaseUid(db, decoded.uid);
  return user ? toSessionUser(user) : null;
}

function toSessionUser(user: {
  id: string;
  firebaseUid: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
}): SessionUser {
  return {
    id: user.id,
    firebaseUid: user.firebaseUid,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
  };
}