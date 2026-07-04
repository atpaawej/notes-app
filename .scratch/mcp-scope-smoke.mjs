// Scope-enforcement smoke test for the notes-mcp SSE server.
//
// Spins up the built server, creates a read-only API key directly in the
// database, connects with it, and asserts that write tools are rejected
// with a 403-style error while read tools succeed.
//
// Usage (from repo root):
//   MCP_PORT=3099 node .scratch/mcp-scope-smoke.mjs
import { config } from "../packages/mcp-server/node_modules/dotenv/lib/main.js";
config({ path: ".env.local" });

import { spawn } from "node:child_process";
import { setTimeout as wait } from "node:timers/promises";
import bcrypt from "../packages/db/node_modules/bcryptjs/index.js";
import postgres from "../packages/db/node_modules/postgres/src/index.js";
import { randomBytes } from "node:crypto";

const PORT = Number(process.env.MCP_PORT ?? 3099);
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL missing — load .env.local first.");
  process.exit(1);
}

const KEY_PREFIX_NAMESPACE = "nt_";
const PREFIX_DISPLAY_LENGTH = 8;
const BCRYPT_COST = 12;

function deriveKeyPrefix(rawKey) {
  return rawKey.slice(0, PREFIX_DISPLAY_LENGTH);
}

// Find an existing user with notes/tags so we have something to read.
const sql = postgres(process.env.DATABASE_URL, { prepare: false });
const [user] = await sql`
  SELECT id FROM users ORDER BY created_at ASC LIMIT 1
`;
if (!user) {
  console.error("No users in the DB — create one via the web app first.");
  process.exit(1);
}
const userId = user.id;
console.log(`Using user ${userId}`);

const rawKey = `${KEY_PREFIX_NAMESPACE}${randomBytes(32).toString("hex")}`;
const keyPrefix = deriveKeyPrefix(rawKey);
const keyHash = await bcrypt.hash(rawKey, BCRYPT_COST);
const [apiKey] = await sql`
  INSERT INTO api_keys (user_id, name, key_hash, key_prefix, scope)
  VALUES (${userId}, ${"MCP scope smoke"}, ${keyHash}, ${keyPrefix}, ${"read"})
  RETURNING id
`;
console.log(`Created read-only API key ${apiKey.id} (prefix ${keyPrefix})`);

const server = spawn(
  process.execPath,
  ["packages/mcp-server/dist/index.js"],
  {
    env: { ...process.env, MCP_PORT: String(PORT) },
    stdio: ["ignore", "pipe", "pipe"],
  },
);

server.stdout.on("data", (b) => process.stdout.write(`[srv] ${b}`));
server.stderr.on("data", (b) => process.stderr.write(`[srv!] ${b}`));

await new Promise((resolve, reject) => {
  let buf = "";
  const onData = (b) => {
    buf += b.toString();
    if (buf.includes("listening on")) resolve();
  };
  server.stdout.on("data", onData);
  server.stderr.on("data", onData);
  setTimeout(() => reject(new Error("server start timeout")), 15000);
});

const sseRes = await fetch(`http://127.0.0.1:${PORT}/sse`, {
  headers: { Authorization: `Bearer ${rawKey}` },
});
if (!sseRes.ok || !sseRes.body) {
  console.error(`SSE handshake failed: HTTP ${sseRes.status}`);
  server.kill();
  await sql`DELETE FROM api_keys WHERE id = ${apiKey.id}`;
  await sql.end();
  process.exit(1);
}
console.log(`SSE connected (HTTP ${sseRes.status})`);

const reader = sseRes.body.getReader();
const decoder = new TextDecoder();
let buffer = "";
const pending = new Map();
let endpoint = null;
const endpointReady = new Promise((resolve) => {
  (async function pump() {
    while (true) {
      const { value, done } = await reader.read();
      if (done) return;
      buffer += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buffer.indexOf("\n\n")) !== -1) {
        const raw = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        const lines = raw.split("\n");
        let event = "message";
        let data = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) event = line.slice(7).trim();
          else if (line.startsWith("data: ")) data += line.slice(6);
        }
        if (event === "endpoint" && data && !endpoint) {
          endpoint = new URL(data, `http://127.0.0.1:${PORT}`).toString();
          resolve();
          continue;
        }
        if (event === "message" && data) {
          let msg;
          try { msg = JSON.parse(data); } catch { continue; }
          if (msg.id != null && pending.has(msg.id)) {
            const { resolve, reject, method } = pending.get(msg.id);
            pending.delete(msg.id);
            if (msg.error) reject(new Error(`${method}: ${msg.error.message}`));
            else resolve(msg.result);
          }
        }
      }
    }
  })();
});
await endpointReady;

let nextId = 1;
async function call(method, params) {
  const id = nextId++;
  const promise = new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject, method });
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error(`${method} timed out after 10s`));
      }
    }, 10000);
  });
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      Authorization: `Bearer ${rawKey}`,
    },
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params: params ?? {} }),
  });
  if (!res.ok) {
    pending.delete(id);
    throw new Error(`HTTP ${res.status} for ${method}`);
  }
  return promise;
}

async function expectWriteRejects(name, args) {
  const result = await call("tools/call", { name, arguments: args });
  if (!result.isError) {
    throw new Error(`${name} should have been rejected for a read key`);
  }
  if (!result.content[0].text.toLowerCase().includes("read")) {
    throw new Error(
      `${name} rejected but message doesn't mention read scope: ${result.content[0].text}`,
    );
  }
  console.log(`${name} → rejected: ${result.content[0].text}`);
}

try {
  // 1. Read tools should still work.
  const list = await call("tools/call", {
    name: "notes_list",
    arguments: { limit: 1 },
  });
  if (list.isError) {
    throw new Error(`notes_list failed: ${JSON.stringify(list)}`);
  }
  const listData = JSON.parse(list.content[0].text);
  console.log(`notes_list → ${listData.total} note(s) (read-only OK)`);

  // 2. Write tools should be rejected.
  await expectWriteRejects("notes_create", {
    title: "Should not be created",
  });
  await expectWriteRejects("notes_update", {
    noteId: "00000000-0000-0000-0000-000000000000",
    title: "Should not be updated",
  });
  await expectWriteRejects("notes_delete", {
    noteId: "00000000-0000-0000-0000-000000000000",
  });

  console.log("\n✅ Scope enforcement tests passed");
} catch (err) {
  console.error("\n❌ Scope test failed:", err);
  process.exitCode = 1;
} finally {
  try { server.kill(); } catch {}
  await sql`DELETE FROM api_keys WHERE id = ${apiKey.id}`;
  console.log("Cleaned up read-only API key");
  await sql.end();
  await wait(200);
  process.exit(process.exitCode ?? 0);
}