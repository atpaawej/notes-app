import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as services from "../src/services";
import * as schema from "../src/schema";
import { eq } from "drizzle-orm";
import { db as mainDb, services as mainServices } from "../src";

async function main() {
  const url = process.env.DATABASE_URL!;
  if (!url) throw new Error("DATABASE_URL not set");

  // Reuse the package's db client - re-import for ensuring env loaded
  const client = postgres(url, { prepare: false });
  const db = drizzle(client, { schema });

  // Use the test user from our manual session (we'll create one ad-hoc)
  const testEmail = `smoke_${Date.now()}@example.com`;
  const firebaseUid = `smoke-${Date.now()}`;

  // Insert a user directly
  const [user] = await db
    .insert(schema.users)
    .values({
      firebaseUid,
      email: testEmail,
      displayName: "Smoke Tester",
      avatarUrl: null,
    })
    .returning();

  console.log(`Created user: ${user.id} (${user.email})`);

  // Create some tags
  const tagA = await services.createTag(db, user.id, "ideas");
  const tagB = await services.createTag(db, user.id, "reading");
  const tagC = await services.createTag(db, user.id, "work");
  console.log(`Created tags: ${tagA.id} (ideas), ${tagB.id} (reading), ${tagC.id} (work)`);

  // Create notes
  const note1 = await services.createNote(db, user.id, {
    title: "First note",
    content: [{ type: "paragraph", content: [{ type: "text", text: "Hello world about reading and ideas." }] }],
    contentText: "Hello world about reading and ideas.",
    tagIds: [tagA.id, tagB.id],
  });
  console.log(`Created note 1: ${note1.id} (tags: ${note1.tags.map((t) => t.name).join(", ")})`);

  const note2 = await services.createNote(db, user.id, {
    title: "Second note",
    content: [{ type: "paragraph", content: [{ type: "text", text: "Just a work note." }] }],
    contentText: "Just a work note.",
    tagIds: [tagC.id],
  });
  console.log(`Created note 2: ${note2.id} (tags: ${note2.tags.map((t) => t.name).join(", ")})`);

  // List all notes
  const all = await services.listNotes(db, user.id);
  console.log(`All notes (${all.total}): ${all.items.map((n) => n.title).join(", ")}`);
  if (all.total !== 2) throw new Error(`Expected 2 notes, got ${all.total}`);

  // Filter by tag
  const byTag = await services.listNotes(db, user.id, { tagId: tagB.id });
  console.log(`Notes tagged "reading" (${byTag.total}): ${byTag.items.map((n) => n.title).join(", ")}`);
  if (byTag.total !== 1 || byTag.items[0].id !== note1.id) {
    throw new Error(`Tag filter failed: expected only note1`);
  }

  // Search
  const bySearch = await services.listNotes(db, user.id, { search: "reading" });
  console.log(`Search "reading" (${bySearch.total}): ${bySearch.items.map((n) => n.title).join(", ")}`);
  if (bySearch.total !== 1) {
    throw new Error(`Search "reading" expected 1, got ${bySearch.total}`);
  }

  const bySearchTitle = await services.listNotes(db, user.id, { search: "Second" });
  console.log(`Search "Second" (${bySearchTitle.total}): ${bySearchTitle.items.map((n) => n.title).join(", ")}`);
  if (bySearchTitle.total !== 1) {
    throw new Error(`Search "Second" expected 1, got ${bySearchTitle.total}`);
  }

  // Update note - replace tags
  const updated = await services.updateNote(db, note1.id, user.id, {
    title: "First note (renamed)",
    tagIds: [tagC.id], // swap from [ideas, reading] to [work]
  });
  console.log(`Updated note 1 tags: ${updated?.tags.map((t) => t.name).join(", ")}`);
  if (updated?.tags.length !== 1 || updated.tags[0].id !== tagC.id) {
    throw new Error(`Update tags failed: expected [work]`);
  }

  // Get notes by tag
  const byWork = await services.getNotesByTag(db, user.id, tagC.id);
  console.log(`Notes tagged work (${byWork.total}): ${byWork.items.map((n) => n.title).join(", ")}`);
  if (byWork.total !== 2) {
    throw new Error(`getNotesByTag expected 2, got ${byWork.total}`);
  }

  // Delete note
  const deleted = await services.deleteNote(db, note2.id, user.id);
  console.log(`Deleted note 2: ${deleted}`);
  if (!deleted) throw new Error("deleteNote returned false");

  const remaining = await services.listNotes(db, user.id);
  console.log(`Remaining notes (${remaining.total}): ${remaining.items.map((n) => n.title).join(", ")}`);
  if (remaining.total !== 1) throw new Error(`Expected 1 remaining, got ${remaining.total}`);

  // Delete tag cascades
  const tagDeleted = await services.deleteTag(db, tagA.id, user.id);
  console.log(`Deleted tag "ideas": ${tagDeleted}`);
  if (!tagDeleted) throw new Error("deleteTag returned false");

  // Cleanup
  await db.delete(schema.users).where(eq(schema.users.id, user.id));

  await client.end();
  console.log("\nAll smoke tests passed!");
  // mainServices and mainDb are unused but referenced to confirm package compiles
  void mainDb;
  void mainServices;
}

main().catch((err) => {
  console.error("Smoke test failed:", err);
  process.exit(1);
});
