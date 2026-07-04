import { db, schema, services, type NoteWithTags } from "@notes/db";
import { z } from "zod";

import { assertWriteScope, type AuthContext } from "./auth.js";

type Tag = typeof schema.tags.$inferSelect;

const uuidSchema = z.string().uuid();

export const notesListInputSchema = {
  search: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe("Optional free-text search across title and plain-text body."),
  tagId: uuidSchema
    .optional()
    .describe("Optional tag id to filter notes by."),
  limit: z
    .number()
    .int()
    .min(1)
    .max(500)
    .optional()
    .describe("Maximum number of notes to return (1-500)."),
  offset: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe("Pagination offset."),
};

export type NotesListInput = z.infer<z.ZodObject<typeof notesListInputSchema>>;

export const notesGetInputSchema = {
  noteId: uuidSchema.describe("Id of the note to fetch."),
};

export type NotesGetInput = z.infer<z.ZodObject<typeof notesGetInputSchema>>;

export const notesCreateInputSchema = {
  title: z
    .string()
    .trim()
    .min(1)
    .max(500)
    .describe("Title of the new note."),
  content: z
    .unknown()
    .optional()
    .describe(
      "Optional BlockNote / ProseMirror JSON document. Defaults to an empty document.",
    ),
  contentText: z
    .string()
    .optional()
    .describe(
      "Optional plain-text representation of the note (used for full-text search).",
    ),
  tagIds: z
    .array(uuidSchema)
    .optional()
    .describe("Optional list of tag ids to assign to the note."),
};

export type NotesCreateInput = z.infer<
  z.ZodObject<typeof notesCreateInputSchema>
>;

export const notesUpdateInputSchema = {
  noteId: uuidSchema.describe("Id of the note to update."),
  title: z
    .string()
    .trim()
    .min(1)
    .max(500)
    .optional()
    .describe("New title for the note."),
  content: z
    .unknown()
    .optional()
    .describe("New BlockNote / ProseMirror JSON document."),
  contentText: z
    .string()
    .optional()
    .describe("New plain-text representation of the note."),
  tagIds: z
    .array(uuidSchema)
    .optional()
    .describe("Replacement list of tag ids (omitted = unchanged)."),
};

export type NotesUpdateInput = z.infer<
  z.ZodObject<typeof notesUpdateInputSchema>
>;

export const notesDeleteInputSchema = {
  noteId: uuidSchema.describe("Id of the note to delete."),
};

export type NotesDeleteInput = z.infer<
  z.ZodObject<typeof notesDeleteInputSchema>
>;

export const tagsListInputSchema = {};

export type TagsListInput = z.infer<z.ZodObject<typeof tagsListInputSchema>>;

export const notesByTagInputSchema = {
  tagId: uuidSchema.describe("Id of the tag whose notes to fetch."),
  limit: z
    .number()
    .int()
    .min(1)
    .max(500)
    .optional()
    .describe("Maximum number of notes to return (1-500)."),
  offset: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe("Pagination offset."),
};

export type NotesByTagInput = z.infer<
  z.ZodObject<typeof notesByTagInputSchema>
>;

type SerializedNote = Omit<NoteWithTags, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};

type SerializedTag = Omit<Tag, "createdAt"> & { createdAt: string };

function serializeNote(note: NoteWithTags): SerializedNote {
  return {
    ...note,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  };
}

function serializeTag(tag: Tag): SerializedTag {
  return { ...tag, createdAt: tag.createdAt.toISOString() };
}

export async function handleNotesList(
  auth: AuthContext,
  input: NotesListInput,
): Promise<unknown> {
  const result = await services.listNotes(db, auth.userId, {
    search: input.search,
    tagId: input.tagId,
    limit: input.limit,
    offset: input.offset,
  });
  return {
    notes: result.items.map(serializeNote),
    total: result.total,
  };
}

export async function handleNotesGet(
  auth: AuthContext,
  input: NotesGetInput,
): Promise<unknown> {
  const note = await services.getNote(db, input.noteId);
  if (!note || note.userId !== auth.userId) {
    throw new Error("Note not found");
  }
  return { note: serializeNote(note) };
}

export async function handleNotesCreate(
  auth: AuthContext,
  input: NotesCreateInput,
): Promise<unknown> {
  assertWriteScope(auth);
  const note = await services.createNote(db, auth.userId, {
    title: input.title,
    content: input.content ?? [],
    contentText: input.contentText ?? "",
    tagIds: input.tagIds,
  });
  return { note: serializeNote(note) };
}

export async function handleNotesUpdate(
  auth: AuthContext,
  input: NotesUpdateInput,
): Promise<unknown> {
  assertWriteScope(auth);
  const updated = await services.updateNote(
    db,
    input.noteId,
    auth.userId,
    {
      title: input.title,
      content: input.content as Parameters<typeof services.updateNote>[3]["content"],
      contentText: input.contentText,
      tagIds: input.tagIds,
    },
  );
  if (!updated) {
    throw new Error("Note not found");
  }
  return { note: serializeNote(updated) };
}

export async function handleNotesDelete(
  auth: AuthContext,
  input: NotesDeleteInput,
): Promise<unknown> {
  assertWriteScope(auth);
  const deleted = await services.deleteNote(db, input.noteId, auth.userId);
  if (!deleted) {
    throw new Error("Note not found");
  }
  return { success: true };
}

export async function handleTagsList(
  auth: AuthContext,
  _input: TagsListInput,
): Promise<unknown> {
  const tags = await services.listTags(db, auth.userId);
  return { tags: tags.map(serializeTag) };
}

export async function handleNotesByTag(
  auth: AuthContext,
  input: NotesByTagInput,
): Promise<unknown> {
  const result = await services.getNotesByTag(db, auth.userId, input.tagId, {
    limit: input.limit,
    offset: input.offset,
  });
  return {
    notes: result.items.map(serializeNote),
    total: result.total,
  };
}