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
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.firebaseUid, data.firebaseUid))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  const insertValues: NewUser = {
    firebaseUid: data.firebaseUid,
    email: data.email,
    displayName: data.displayName ?? null,
    avatarUrl: data.avatarUrl ?? null,
  };

  const [created] = await db.insert(users).values(insertValues).returning();
  return created;
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