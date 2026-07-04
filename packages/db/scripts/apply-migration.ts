import { readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL!;
  if (!url) throw new Error("DATABASE_URL not set");

  const file = process.argv[2];
  if (!file) throw new Error("Usage: tsx scripts/apply-migration.ts <file>");

  const sql = postgres(url, { prepare: false, onnotice: () => {} });

  const statements = readFileSync(join(process.cwd(), file), "utf8")
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean);

  try {
    for (const stmt of statements) {
      await sql.unsafe(stmt);
    }
    console.log(`Applied ${statements.length} statements from ${file}`);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exitCode = 1;
  } finally {
    await sql.end();
  }
}

void main();
