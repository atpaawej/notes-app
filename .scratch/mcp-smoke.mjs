// End-to-end smoke test for the notes-mcp SSE server.
//
// Spins up the built server against the real .env.local DATABASE_URL,
// connects via SSE with the given API key, and exercises every tool
// (read + write). The create+delete pair uses a clearly-tagged title
// so it can be cleaned up manually if anything goes wrong.
//
// Usage (from repo root):
//   MCP_PORT=3099 MCP_API_KEY=nt_... node .scratch/mcp-smoke.mjs
import { config } from "../packages/mcp-server/node_modules/dotenv/lib/main.js";
config({ path: ".env.local" });

import { spawn } from "node:child_process";
import { setTimeout as wait } from "node:timers/promises";

const PORT = Number(process.env.MCP_PORT ?? 3099);
const API_KEY = process.env.MCP_API_KEY;
if (!API_KEY) {
  console.error("Set MCP_API_KEY env var (an nt_... key) before running.");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL missing — load .env.local first.");
  process.exit(1);
}

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
  headers: { Authorization: `Bearer ${API_KEY}` },
});
if (!sseRes.ok || !sseRes.body) {
  console.error(`SSE handshake failed: HTTP ${sseRes.status}`);
  server.kill();
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
          try {
            msg = JSON.parse(data);
          } catch {
            continue;
          }
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
console.log(`Got endpoint: ${endpoint}`);

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
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id,
      method,
      params: params ?? {},
    }),
  });
  if (!res.ok) {
    pending.delete(id);
    throw new Error(`HTTP ${res.status} for ${method}`);
  }
  return promise;
}

try {
  // 1. tools/list
  const tools = await call("tools/list");
  console.log(
    `tools/list → ${tools.tools.length} tools:`,
    tools.tools.map((t) => t.name).join(", "),
  );
  for (const name of [
    "notes_list",
    "notes_get",
    "notes_create",
    "notes_update",
    "notes_delete",
    "tags_list",
    "notes_by_tag",
  ]) {
    if (!tools.tools.find((t) => t.name === name)) {
      throw new Error(`Missing tool: ${name}`);
    }
  }

  // 2. tags_list
  const tagsRes = await call("tools/call", { name: "tags_list", arguments: {} });
  const tagsData = JSON.parse(tagsRes.content[0].text);
  console.log(`tags_list → ${tagsData.tags.length} tag(s)`);

  // 3. notes_list
  const listRes = await call("tools/call", {
    name: "notes_list",
    arguments: { limit: 5 },
  });
  const listData = JSON.parse(listRes.content[0].text);
  console.log(`notes_list → ${listData.total} note(s) total`);

  // 4. notes_create
  const createRes = await call("tools/call", {
    name: "notes_create",
    arguments: {
      title: "MCP SMOKE TEST (delete me)",
      contentText: "Created by mcp-smoke.mjs — safe to delete.",
    },
  });
  const created = JSON.parse(createRes.content[0].text).note;
  console.log(`notes_create → ${created.id}`);

  // 5. notes_get
  const getRes = await call("tools/call", {
    name: "notes_get",
    arguments: { noteId: created.id },
  });
  const fetched = JSON.parse(getRes.content[0].text).note;
  if (fetched.id !== created.id) {
    throw new Error(`notes_get returned wrong note: ${fetched.id}`);
  }
  console.log(`notes_get → OK`);

  // 6. notes_update
  const updRes = await call("tools/call", {
    name: "notes_update",
    arguments: {
      noteId: created.id,
      title: "MCP SMOKE TEST (updated)",
    },
  });
  const updated = JSON.parse(updRes.content[0].text).note;
  if (updated.title !== "MCP SMOKE TEST (updated)") {
    throw new Error(`notes_update did not change title: ${updated.title}`);
  }
  console.log(`notes_update → OK`);

  // 7. notes_by_tag (only if any tags exist)
  if (tagsData.tags.length > 0) {
    const byTagRes = await call("tools/call", {
      name: "notes_by_tag",
      arguments: { tagId: tagsData.tags[0].id, limit: 5 },
    });
    const byTagData = JSON.parse(byTagRes.content[0].text);
    console.log(
      `notes_by_tag → ${byTagData.total} note(s) tagged "${tagsData.tags[0].name}"`,
    );
  } else {
    console.log("notes_by_tag → skipped (no tags)");
  }

  // 8. notes_delete (cleanup)
  const delRes = await call("tools/call", {
    name: "notes_delete",
    arguments: { noteId: created.id },
  });
  const delData = JSON.parse(delRes.content[0].text);
  if (!delData.success) {
    throw new Error(`notes_delete returned success=false`);
  }
  console.log(`notes_delete → OK`);

  // 9. Verify deleted — the tool returns an isError result, not a JSON-RPC error
  const afterDel = await call("tools/call", {
    name: "notes_get",
    arguments: { noteId: created.id },
  });
  if (!afterDel.isError) {
    throw new Error(
      `notes_get after delete should have been an error, got: ${JSON.stringify(afterDel)}`,
    );
  }
  if (!afterDel.content[0].text.includes("Note not found")) {
    throw new Error(
      `notes_get after delete text wrong: ${afterDel.content[0].text}`,
    );
  }
  console.log(`notes_get after delete → isError (expected)`);

  console.log("\n✅ All smoke tests passed");
} catch (err) {
  console.error("\n❌ Smoke test failed:", err);
  process.exitCode = 1;
} finally {
  try {
    server.kill();
  } catch {}
  await wait(200);
  process.exit(process.exitCode ?? 0);
}