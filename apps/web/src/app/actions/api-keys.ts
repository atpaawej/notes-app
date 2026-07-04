"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db, services } from "@notes/db";

import { requireUser } from "@/lib/auth/require-user";

const createSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  scope: z.enum(["read", "read_write"]),
});

export type CreateApiKeyResult =
  | {
      ok: true;
      apiKey: {
        id: string;
        name: string;
        keyPrefix: string;
        scope: "read" | "read_write";
        createdAt: string;
      };
      rawKey: string;
    }
  | { ok: false; error: string };

export async function createApiKeyAction(
  input: z.input<typeof createSchema>,
): Promise<CreateApiKeyResult> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      error: issue?.message ?? "Invalid API key payload.",
    };
  }

  const user = await requireUser();

  try {
    const result = await services.createApiKey(db, user.id, {
      name: parsed.data.name,
      scope: parsed.data.scope,
    });

    revalidatePath("/dashboard/settings");

    return {
      ok: true,
      rawKey: result.rawKey,
      apiKey: {
        id: result.apiKey.id,
        name: result.apiKey.name,
        keyPrefix: result.apiKey.keyPrefix,
        scope: result.apiKey.scope as "read" | "read_write",
        createdAt: result.apiKey.createdAt.toISOString(),
      },
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create API key";
    return { ok: false, error: message };
  }
}

const deleteSchema = z.object({
  apiKeyId: z.string().uuid("Invalid API key id."),
});

export type DeleteApiKeyResult =
  | { ok: true }
  | { ok: false; error: string };

export async function deleteApiKeyAction(
  input: z.input<typeof deleteSchema>,
): Promise<DeleteApiKeyResult> {
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid API key id." };
  }

  const user = await requireUser();

  const deleted = await services.deleteApiKey(
    db,
    parsed.data.apiKeyId,
    user.id,
  );

  if (!deleted) {
    return { ok: false, error: "API key not found." };
  }

  revalidatePath("/dashboard/settings");
  return { ok: true };
}