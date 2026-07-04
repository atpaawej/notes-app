import { and, asc, eq, sql } from "drizzle-orm";

import type { Database } from "../client";
import { notes, notesTags, tags, type NewTag, type Tag } from "../schema";

export async function listTags(
  db: Database,
  userId: string,
): Promise<Tag[]> {
  return db
    .select()
    .from(tags)
    .where(eq(tags.userId, userId))
    .orderBy(asc(tags.name));
}

export async function listTagsWithCounts(
  db: Database,
  userId: string,
): Promise<(Tag & { noteCount: number })[]> {
  const rows = await db
    .select({
      id: tags.id,
      userId: tags.userId,
      name: tags.name,
      createdAt: tags.createdAt,
      noteCount: sql<number>`count(${notes.id})::int`,
    })
    .from(tags)
    .leftJoin(notesTags, eq(notesTags.tagId, tags.id))
    .leftJoin(notes, eq(notes.id, notesTags.noteId))
    .where(eq(tags.userId, userId))
    .groupBy(tags.id)
    .orderBy(asc(tags.name));

  return rows;
}

export async function createTag(
  db: Database,
  userId: string,
  name: string,
): Promise<Tag> {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    throw new Error("Tag name cannot be empty");
  }

  const insertValues: NewTag = {
    userId,
    name: trimmed,
  };

  const inserted = await db
    .insert(tags)
    .values(insertValues)
    .onConflictDoNothing({
      target: [tags.userId, tags.name],
    })
    .returning();

  if (inserted.length > 0) {
    return inserted[0];
  }

  const existing = await db
    .select()
    .from(tags)
    .where(and(eq(tags.userId, userId), eq(tags.name, trimmed)))
    .limit(1);

  if (existing.length === 0) {
    throw new Error("Failed to create or fetch tag");
  }

  return existing[0];
}

export async function deleteTag(
  db: Database,
  tagId: string,
  userId: string,
): Promise<boolean> {
  const rows = await db
    .select()
    .from(tags)
    .where(and(eq(tags.id, tagId), eq(tags.userId, userId)))
    .limit(1);

  if (rows.length === 0) {
    return false;
  }

  await db.delete(tags).where(eq(tags.id, tagId));
  return true;
}
