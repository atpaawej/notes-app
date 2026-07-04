import type { Request } from "express";

import { db, services, type ApiKeyScope } from "@notes/db";

export type AuthContext = {
  userId: string;
  apiKeyId: string;
  scope: ApiKeyScope;
};

export class AuthError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

export function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;

  const trimmed = header.trim();
  if (!trimmed.toLowerCase().startsWith("bearer ")) return null;

  const token = trimmed.slice(7).trim();
  return token.length > 0 ? token : null;
}

export async function authenticateRequest(
  req: Request,
): Promise<AuthContext> {
  const token = extractBearerToken(req);
  if (!token) {
    throw new AuthError("Missing Authorization: Bearer <api-key>", 401);
  }

  let verified;
  try {
    verified = await services.verifyApiKey(db, token);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "API key verification failed";
    throw new AuthError(`Authentication backend error: ${message}`, 500);
  }

  if (!verified) {
    throw new AuthError("Invalid API key", 401);
  }

  return {
    userId: verified.user.id,
    apiKeyId: verified.apiKeyId,
    scope: verified.scope,
  };
}

export function assertWriteScope(auth: AuthContext): void {
  if (auth.scope !== "read_write") {
    throw new AuthError(
      "API key scope 'read' is not allowed to perform write operations",
      403,
    );
  }
}