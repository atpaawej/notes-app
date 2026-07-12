import { eq } from "drizzle-orm";

import type { Database } from "../client";
import { users, type NewUser, type User } from "../schema/users";

export async function findOrCreateUser(
  db: Database,
  data: {
    firebaseUid: string;
    email: string;
    displayName?: string | null;
    avatarUrl?: string | null;
  },
): Promise<User> {
  const insertValues: NewUser = {
    firebaseUid: data.firebaseUid,
    email: data.email,
    displayName: data.displayName ?? null,
    avatarUrl: data.avatarUrl ?? null,
  };

  const inserted = await db
    .insert(users)
    .values(insertValues)
    .onConflictDoNothing({ target: users.firebaseUid })
    .returning();

  if (inserted.length > 0) {
    return inserted[0];
  }

  const rows = await db
    .select()
    .from(users)
    .where(eq(users.firebaseUid, data.firebaseUid))
    .limit(1);

  if (rows.length === 0) {
    throw new Error(
      `findOrCreateUser: insert was a no-op but the row is missing for firebase_uid=${data.firebaseUid}`,
    );
  }

  return rows[0];
}

export async function getUserByFirebaseUid(
  db: Database,
  firebaseUid: string,
): Promise<User | null> {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.firebaseUid, firebaseUid))
    .limit(1);

  return rows[0] ?? null;
}

export async function getUserById(
  db: Database,
  id: string,
): Promise<User | null> {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getUserByEmail(
  db: Database,
  email: string,
): Promise<User | null> {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return rows[0] ?? null;
}