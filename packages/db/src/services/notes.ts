import { and, asc, desc, eq, inArray, or, Param, sql, type SQL } from "drizzle-orm";

import type { Database } from "../client";
import {
  notes,
  notesTags,
  tags,
  type NewNote,
  type Note,
  type Tag,
} from "../schema";

export type NoteWithTags = Note & { tags: Tag[] };

export type ListNotesFilters = {
  search?: string;
  tagId?: string;
  limit?: number;
  offset?: number;
};

export type ListNotesResult = {
  items: NoteWithTags[];
  total: number;
};

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

function toJsonb(value: unknown): SQL {
  return sql`${new Param(JSON.stringify(value))}::jsonb`;
}

export async function listNotes(
  db: Database,
  userId: string,
  filters: ListNotesFilters = {},
): Promise<ListNotesResult> {
  const { search, tagId, limit = 100, offset = 0 } = filters;

  const conditions = [eq(notes.userId, userId)];

  if (search && search.trim().length > 0) {
    const tsQuery = sql`plainto_tsquery('english', ${search})`;
    const titlePattern = `%${escapeLikePattern(search)}%`;
    conditions.push(
      or(
        sql`to_tsvector('english', ${notes.contentText}) @@ ${tsQuery}`,
        sql`${notes.title} ILIKE ${titlePattern} ESCAPE '\\'`,
      )!,
    );
  }

  if (tagId) {
    const noteIdsWithTag = db
      .select({ noteId: notesTags.noteId })
      .from(notesTags)
      .where(eq(notesTags.tagId, tagId));
    conditions.push(inArray(notes.id, noteIdsWithTag));
  }

  const where = and(...conditions);

  const rows = await db
    .select({ note: notes })
    .from(notes)
    .where(where)
    .orderBy(desc(notes.updatedAt))
    .limit(limit)
    .offset(offset);

  const totalResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notes)
    .where(where);

  const total = totalResult[0]?.count ?? 0;

  if (rows.length === 0) {
    return { items: [], total };
  }

  const noteIds = rows.map((r) => r.note.id);
  const tagLinks = await db
    .select({
      noteId: notesTags.noteId,
      tag: tags,
    })
    .from(notesTags)
    .innerJoin(tags, eq(notesTags.tagId, tags.id))
    .where(inArray(notesTags.noteId, noteIds));

  const tagsByNote = new Map<string, Tag[]>();
  for (const link of tagLinks) {
    const list = tagsByNote.get(link.noteId) ?? [];
    list.push(link.tag);
    tagsByNote.set(link.noteId, list);
  }

  const items: NoteWithTags[] = rows.map((r) => ({
    ...r.note,
    tags: tagsByNote.get(r.note.id) ?? [],
  }));

  return { items, total };
}

export async function getNote(
  db: Database,
  noteId: string,
): Promise<NoteWithTags | null> {
  const rows = await db
    .select()
    .from(notes)
    .where(eq(notes.id, noteId))
    .limit(1);

  const note = rows[0];
  if (!note) return null;

  const noteTags = await db
    .select({ tag: tags })
    .from(notesTags)
    .innerJoin(tags, eq(notesTags.tagId, tags.id))
    .where(eq(notesTags.noteId, noteId));

  return {
    ...note,
    tags: noteTags.map((r) => r.tag),
  };
}

export async function createNote(
  db: Database,
  userId: string,
  data: {
    title: string;
    content?: unknown;
    contentText?: string;
    tagIds?: string[];
  },
): Promise<NoteWithTags> {
  const insertValues: NewNote = {
    userId,
    title: data.title,
    content: toJsonb(data.content ?? []),
    contentText: data.contentText ?? "",
  };

  const inserted = await db
    .insert(notes)
    .values(insertValues)
    .returning();

  const note = inserted[0];

  if (data.tagIds && data.tagIds.length > 0) {
    await assignTags(db, note.id, data.tagIds, userId);
  }

  return { ...note, tags: await listTagsForNote(db, note.id) };
}

export async function updateNote(
  db: Database,
  noteId: string,
  userId: string,
  data: {
    title?: string;
    content?: unknown;
    contentText?: string;
    tagIds?: string[];
  },
): Promise<NoteWithTags | null> {
  const existing = await getNote(db, noteId);
  if (!existing || existing.userId !== userId) return null;

  const updateValues: Partial<NewNote> = {};
  if (data.title !== undefined) updateValues.title = data.title;
  if (data.content !== undefined) {
    updateValues.content = toJsonb(data.content);
  }
  if (data.contentText !== undefined) {
    updateValues.contentText = data.contentText;
  }
  updateValues.updatedAt = new Date();

  await db.update(notes).set(updateValues).where(eq(notes.id, noteId));

  if (data.tagIds !== undefined) {
    await assignTags(db, noteId, data.tagIds, userId);
  }

  return getNote(db, noteId);
}

export async function deleteNote(
  db: Database,
  noteId: string,
  userId: string,
): Promise<boolean> {
  const rows = await db
    .select({ userId: notes.userId })
    .from(notes)
    .where(eq(notes.id, noteId))
    .limit(1);

  if (rows.length === 0 || rows[0].userId !== userId) {
    return false;
  }

  await db.delete(notes).where(eq(notes.id, noteId));
  return true;
}

export async function listTagsForNote(
  db: Database,
  noteId: string,
): Promise<Tag[]> {
  const rows = await db
    .select({ tag: tags })
    .from(notesTags)
    .innerJoin(tags, eq(notesTags.tagId, tags.id))
    .where(eq(notesTags.noteId, noteId))
    .orderBy(asc(tags.name));
  return rows.map((r) => r.tag);
}

export async function getNotesByTag(
  db: Database,
  userId: string,
  tagId: string,
  pagination?: { limit?: number; offset?: number },
): Promise<ListNotesResult> {
  return listNotes(db, userId, {
    tagId,
    limit: pagination?.limit,
    offset: pagination?.offset,
  });
}

async function assignTags(
  db: Database,
  noteId: string,
  tagIds: string[],
  userId: string,
): Promise<void> {
  await db.delete(notesTags).where(eq(notesTags.noteId, noteId));

  if (tagIds.length === 0) {
    return;
  }

  const valid = await db
    .select({ id: tags.id })
    .from(tags)
    .where(and(eq(tags.userId, userId), inArray(tags.id, tagIds)));

  const validIds = valid.map((r) => r.id);
  if (validIds.length === 0) {
    return;
  }

  await db
    .insert(notesTags)
    .values(validIds.map((tagId) => ({ noteId, tagId })))
    .onConflictDoNothing();
}
