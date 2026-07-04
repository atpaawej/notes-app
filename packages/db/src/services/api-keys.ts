import { randomBytes } from "node:crypto";

import { compare, hash } from "bcryptjs";
import { and, desc, eq } from "drizzle-orm";

import type { Database } from "../client";
import {
  apiKeys,
  apiKeyScope,
  users,
  type ApiKey,
  type ApiKeyScope,
  type NewApiKey,
  type User,
} from "../schema";

const KEY_PREFIX_NAMESPACE = "nt_";
const PREFIX_DISPLAY_LENGTH = 8;
const BCRYPT_COST = 12;

export type CreateApiKeyData = {
  name: string;
  scope: ApiKeyScope;
};

export type CreateApiKeyResult = {
  apiKey: ApiKey;
  rawKey: string;
};

export function generateRawApiKey(): string {
  return `${KEY_PREFIX_NAMESPACE}${randomBytes(32).toString("hex")}`;
}

export function deriveKeyPrefix(rawKey: string): string {
  return rawKey.slice(0, PREFIX_DISPLAY_LENGTH);
}

export async function createApiKey(
  db: Database,
  userId: string,
  data: CreateApiKeyData,
): Promise<CreateApiKeyResult> {
  const name = data.name.trim();
  if (name.length === 0) {
    throw new Error("API key name cannot be empty");
  }
  if (!apiKeyScope.includes(data.scope)) {
    throw new Error(`Invalid API key scope: ${data.scope}`);
  }

  const rawKey = generateRawApiKey();
  const keyPrefix = deriveKeyPrefix(rawKey);
  const keyHash = await hash(rawKey, BCRYPT_COST);

  const insertValues: NewApiKey = {
    userId,
    name,
    keyHash,
    keyPrefix,
    scope: data.scope,
  };

  const inserted = await db.insert(apiKeys).values(insertValues).returning();
  const apiKey = inserted[0];

  return { apiKey, rawKey };
}

export async function listApiKeys(
  db: Database,
  userId: string,
): Promise<ApiKey[]> {
  return db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.userId, userId))
    .orderBy(desc(apiKeys.createdAt));
}

export async function deleteApiKey(
  db: Database,
  keyId: string,
  userId: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: apiKeys.id })
    .from(apiKeys)
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, userId)))
    .limit(1);

  if (rows.length === 0) {
    return false;
  }

  await db.delete(apiKeys).where(eq(apiKeys.id, keyId));
  return true;
}

export type VerifiedApiKey = {
  user: User;
  apiKey: ApiKey;
};

export async function verifyApiKey(
  db: Database,
  rawKey: string,
): Promise<VerifiedApiKey | null> {
  if (!rawKey || !rawKey.startsWith(KEY_PREFIX_NAMESPACE)) {
    return null;
  }

  const keyPrefix = deriveKeyPrefix(rawKey);

  const candidates = await db
    .select({ apiKey: apiKeys, user: users })
    .from(apiKeys)
    .innerJoin(users, eq(users.id, apiKeys.userId))
    .where(eq(apiKeys.keyPrefix, keyPrefix));

  for (const candidate of candidates) {
    const matches = await compare(rawKey, candidate.apiKey.keyHash);
    if (!matches) continue;

    db.update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, candidate.apiKey.id))
      .catch(() => {
        // best-effort: never block auth on last-used write
      });

    return { user: candidate.user, apiKey: candidate.apiKey };
  }

  return null;
}