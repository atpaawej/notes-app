import { db, services } from "@notes/db";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { authFailureResponse } from "@/lib/auth/api-error";
import { verifySessionToken } from "@/lib/auth/verify-session-token";

export const dynamic = "force-dynamic";

// ── Shared helpers ────────────────────────────────────────────────────

const uuidSchema = z.string().uuid();

type NoteWithTags = Awaited<ReturnType<typeof services.getNote>>;

function serializeNote(note: NonNullable<NoteWithTags>) {
  return {
    ...note,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
    tags: note.tags.map((t) => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
    })),
  };
}

// ── GET /api/notes/:id ────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ noteId: string }> },
) {
  const verified = await verifySessionToken(request);
  if (!verified.ok) {
    return authFailureResponse(verified.error);
  }

  const { noteId } = await params;
  const idResult = uuidSchema.safeParse(noteId);
  if (!idResult.success) {
    return NextResponse.json({ error: "Invalid note id" }, { status: 400 });
  }

  const note = await services.getNote(db, idResult.data);
  if (!note || note.userId !== verified.auth.userId) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  return NextResponse.json({ note: serializeNote(note) });
}

// ── PATCH /api/notes/:id ──────────────────────────────────────────────

const updateBodySchema = z.object({
  title: z.string().trim().min(1).max(500).optional(),
  content: z.unknown().optional(),
  contentText: z.string().optional(),
  tagIds: z.array(uuidSchema).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ noteId: string }> },
) {
  const verified = await verifySessionToken(request);
  if (!verified.ok) {
    return authFailureResponse(verified.error);
  }

  const { noteId } = await params;
  const idResult = uuidSchema.safeParse(noteId);
  if (!idResult.success) {
    return NextResponse.json({ error: "Invalid note id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON" },
      { status: 400 },
    );
  }

  const parsed = updateBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const updated = await services.updateNote(
    db,
    idResult.data,
    verified.auth.userId,
    {
      title: parsed.data.title,
      content: parsed.data.content,
      contentText: parsed.data.contentText,
      tagIds: parsed.data.tagIds,
    },
  );

  if (!updated) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  return NextResponse.json({ note: serializeNote(updated) });
}

// ── DELETE /api/notes/:id ─────────────────────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ noteId: string }> },
) {
  const verified = await verifySessionToken(request);
  if (!verified.ok) {
    return authFailureResponse(verified.error);
  }

  const { noteId } = await params;
  const idResult = uuidSchema.safeParse(noteId);
  if (!idResult.success) {
    return NextResponse.json({ error: "Invalid note id" }, { status: 400 });
  }

  const deleted = await services.deleteNote(
    db,
    idResult.data,
    verified.auth.userId,
  );

  if (!deleted) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
