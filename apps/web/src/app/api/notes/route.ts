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

// ── GET /api/notes ────────────────────────────────────────────────────

const listQuerySchema = z.object({
  search: z.string().trim().min(1).optional(),
  tagId: uuidSchema.optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export async function GET(request: NextRequest) {
  const verified = await verifySessionToken(request);
  if (!verified.ok) {
    return authFailureResponse(verified.error);
  }

  const { searchParams } = request.nextUrl;
  const parsed = listQuerySchema.safeParse({
    search: searchParams.get("search") ?? undefined,
    tagId: searchParams.get("tagId") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    offset: searchParams.get("offset") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const result = await services.listNotes(db, verified.auth.userId, {
    search: parsed.data.search,
    tagId: parsed.data.tagId,
    limit: parsed.data.limit,
    offset: parsed.data.offset,
  });

  return NextResponse.json({
    notes: result.items.map(serializeNote),
    total: result.total,
  });
}

// ── POST /api/notes ───────────────────────────────────────────────────

const createBodySchema = z.object({
  title: z.string().trim().min(1).max(500),
  content: z.unknown().optional(),
  contentText: z.string().optional(),
  tagIds: z.array(uuidSchema).optional(),
});

export async function POST(request: NextRequest) {
  const verified = await verifySessionToken(request);
  if (!verified.ok) {
    return authFailureResponse(verified.error);
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

  const parsed = createBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const note = await services.createNote(db, verified.auth.userId, {
    title: parsed.data.title,
    content: parsed.data.content ?? [],
    contentText: parsed.data.contentText ?? "",
    tagIds: parsed.data.tagIds,
  });

  return NextResponse.json({ note: serializeNote(note) }, { status: 201 });
}
