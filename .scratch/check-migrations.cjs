// One-off script used during issue #3 to verify that all 3 Drizzle migrations
// had been applied to the live Neon DB. Prints the list of public tables and
// the api_keys table's columns, FKs, CHECK constraints, and indexes.
//
// Usage (from repo root):
//   DATABASE_URL=... node .scratch/check-migrations.cjs
const postgres = require("postgres");
const sql = postgres(process.env.DATABASE_URL, { prepare: false });

(async () => {
  const tables = await sql`
    SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename
  `;
  console.log("Tables:", tables.map((t) => t.tablename).join(", "));

  const cols = await sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='api_keys'
    ORDER BY ordinal_position
  `;
  console.log("\napi_keys columns:");
  for (const c of cols) {
    console.log(" ", c.column_name, c.data_type, c.is_nullable === "YES" ? "NULL" : "NOT NULL");
  }

  const fks = await sql`
    SELECT conname, pg_get_constraintdef(oid) AS def
    FROM pg_constraint
    WHERE conrelid = 'public.api_keys'::regclass AND contype = 'f'
  `;
  console.log("\nFKs:", fks.map((f) => `${f.conname}: ${f.def}`).join("\n  ") || "(none)");

  const checks = await sql`
    SELECT conname, pg_get_constraintdef(oid) AS def
    FROM pg_constraint
    WHERE conrelid = 'public.api_keys'::regclass AND contype = 'c'
  `;
  console.log("\nChecks:", checks.map((c) => `${c.conname}: ${c.def}`).join("\n  ") || "(none)");

  const idx = await sql`
    SELECT indexname, indexdef FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'api_keys'
  `;
  console.log("\nIndexes:", idx.map((i) => `${i.indexname}: ${i.indexdef}`).join("\n  "));

  await sql.end();
})().catch((e) => {
  console.error("FAIL:", e.message);
  process.exit(1);
});