"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db, services } from "@notes/db";

import { requireUser } from "@/lib/auth/require-user";

const createSchema = z.object({
  name: z.string().trim().min(1).max(50),
});

export type CreateTagResult =
  | { ok: true; id: string; name: string }
  | { ok: false; error: string };

export async function createTagAction(
  input: z.input<typeof createSchema>,
): Promise<CreateTagResult> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Tag name is required." };
  }

  const user = await requireUser();

  try {
    const tag = await services.createTag(db, user.id, parsed.data.name);
    revalidatePath("/dashboard");
    return { ok: true, id: tag.id, name: tag.name };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create tag";
    return { ok: false, error: message };
  }
}

export type DeleteTagResult =
  | { ok: true }
  | { ok: false; error: string };

export async function deleteTagAction(
  tagId: string,
): Promise<DeleteTagResult> {
  const uuid = z.string().uuid().safeParse(tagId);
  if (!uuid.success) {
    return { ok: false, error: "Invalid tag id." };
  }

  const user = await requireUser();

  const deleted = await services.deleteTag(db, uuid.data, user.id);
  if (!deleted) {
    return { ok: false, error: "Tag not found." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/tags");
  return { ok: true };
}
