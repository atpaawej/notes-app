"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db, services } from "@notes/db";

import { extractPlainTextFromBlockNote } from "@/lib/notes/extract-text";
import { requireUser } from "@/lib/auth/require-user";

const createSchema = z.object({
  title: z.string().trim().min(1).max(500),
  tagIds: z.array(z.string().uuid()).optional(),
});

const updateSchema = z.object({
  noteId: z.string().uuid(),
  title: z.string().trim().min(1).max(500).optional(),
  content: z.unknown().optional(),
  tagIds: z.array(z.string().uuid()).optional(),
});

const idSchema = z.string().uuid();

export type CreateNoteResult =
  | { ok: true; noteId: string }
  | { ok: false; error: string };

export async function createNoteAction(
  input: z.input<typeof createSchema>,
): Promise<CreateNoteResult> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Title is required." };
  }

  const user = await requireUser();

  const note = await services.createNote(db, user.id, {
    title: parsed.data.title,
    content: [],
    contentText: "",
    tagIds: parsed.data.tagIds,
  });

  revalidatePath("/dashboard");
  return { ok: true, noteId: note.id };
}

export type UpdateNoteResult =
  | { ok: true; updatedAt: string }
  | { ok: false; error: string };

export async function updateNoteAction(
  input: z.input<typeof updateSchema>,
): Promise<UpdateNoteResult> {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid note payload." };
  }

  const user = await requireUser();
  const { noteId, content, ...rest } = parsed.data;

  let contentText: string | undefined;
  if (content !== undefined) {
    contentText = extractPlainTextFromBlockNote(content);
  }

  const updated = await services.updateNote(db, noteId, user.id, {
    ...rest,
    content,
    contentText,
  });

  if (!updated) {
    return { ok: false, error: "Note not found." };
  }

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/notes/${noteId}`);
  return { ok: true, updatedAt: updated.updatedAt.toISOString() };
}

export type DeleteNoteResult =
  | { ok: true }
  | { ok: false; error: string };

export async function deleteNoteAction(
  noteId: string,
): Promise<DeleteNoteResult> {
  const parsed = idSchema.safeParse(noteId);
  if (!parsed.success) {
    return { ok: false, error: "Invalid note id." };
  }

  const user = await requireUser();

  const deleted = await services.deleteNote(db, parsed.data, user.id);
  if (!deleted) {
    return { ok: false, error: "Note not found." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/tags");
  return { ok: true };
}
