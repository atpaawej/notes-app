import { db, services } from "@notes/db";
import { NextResponse, type NextRequest } from "next/server";

import { authFailureResponse } from "@/lib/auth/api-error";
import { verifySessionToken } from "@/lib/auth/verify-session-token";

export const dynamic = "force-dynamic";

// ── GET /api/tags ─────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const verified = await verifySessionToken(request);
  if (!verified.ok) {
    return authFailureResponse(verified.error);
  }

  const tags = await services.listTags(db, verified.auth.userId);

  return NextResponse.json({
    tags: tags.map((t) => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
    })),
  });
}
