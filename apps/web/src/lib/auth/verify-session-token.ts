import "server-only";

import { verify } from "@agentonboard/sdk";
import { db, services } from "@notes/db";
import { type NextRequest } from "next/server";

export type SessionTokenAuth = {
  userId: string;
  email: string;
};

export type TokenVerifyError =
  | { code: "MISSING_TOKEN" }
  | { code: "INVALID_TOKEN"; detail?: string }
  | { code: "USER_NOT_FOUND"; email: string }
  | { code: "SERVER_CONFIG_ERROR" };

export type TokenVerifyResult =
  | { ok: true; auth: SessionTokenAuth }
  | { ok: false; error: TokenVerifyError };

/**
 * Reads the X-Session-Token header from an incoming request, verifies it
 * against the AgentOnboard API, looks up the user by email in the local DB,
 * and returns the user's identity.
 */
export async function verifySessionToken(
  request: NextRequest,
): Promise<TokenVerifyResult> {
  const sessionToken = request.headers.get("x-session-token");
  if (!sessionToken) {
    return { ok: false, error: { code: "MISSING_TOKEN" } };
  }

  const partnerKey = process.env.AGENTONBOARD_PARTNER_KEY;
  if (!partnerKey) {
    console.error(
      "AGENTONBOARD_PARTNER_KEY is not set — cannot verify session tokens",
    );
    return { ok: false, error: { code: "SERVER_CONFIG_ERROR" } };
  }

  let result;
  try {
    result = await verify(partnerKey, sessionToken);
  } catch (err) {
    console.error("AgentOnboard verify() threw:", err);
    return {
      ok: false,
      error: { code: "INVALID_TOKEN", detail: "Token verification request failed" },
    };
  }

  if (!result.ok) {
    return {
      ok: false,
      error: { code: "INVALID_TOKEN", detail: result.error ?? "Token rejected" },
    };
  }

  if (!result.email) {
    return {
      ok: false,
      error: { code: "INVALID_TOKEN", detail: "Token did not contain an email" },
    };
  }

  const user = await services.getUserByEmail(db, result.email);
  if (!user) {
    return {
      ok: false,
      error: { code: "USER_NOT_FOUND", email: result.email },
    };
  }

  return { ok: true, auth: { userId: user.id, email: user.email } };
}
