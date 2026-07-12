# Notes App

A personal note-taking app with a Notion-like block editor (BlockNote), tag-based organization, full-text search, API-key-scoped access, an MCP server for AI clients, and a REST API authenticated via AgentOnboard for AI agents.

## Stack

| Layer | Technology |
|---|---|
| **Web app** | Next.js 16 (App Router) + TypeScript + React 19 |
| **Editor** | BlockNote (ProseMirror blocks, stored as JSONB + plain text for FTS) |
| **UI** | shadcn/ui v4, dark mode only, Neutral palette |
| **Database** | Neon Postgres via Drizzle ORM |
| **Auth (web)** | Firebase Auth (Google OAuth) + Firebase session cookies |
| **Auth (MCP)** | API keys (`nt_…`) hashed with bcrypt, `read` / `read_write` scopes |
| **Auth (REST API)** | AgentOnboard session tokens via `@agentonboard/sdk` |
| **MCP** | `@modelcontextprotocol/sdk` v1.29, SSE transport |
| **Deploy** | Vercel (web + REST API), Cloud Run (MCP server) |

## Project structure

```
notes-app/
├── apps/
│   └── web/                # Next.js app (App Router, server actions, shadcn UI)
│       └── src/app/api/    # AgentOnboard REST API routes
│
├── packages/
│   ├── db/                 # Drizzle schema + business-logic services (shared)
│   │   ├── src/schema/     # users, notes, tags, notes_tags, api_keys
│   │   └── src/services/   # createNote/getNote/listNotes/updateNote/deleteNote/...
│   │
│   └── mcp-server/         # MCP server (SSE, API key auth, 7 tools)
│       ├── src/auth.ts     # Bearer extraction, verifyApiKey, scope assertion
│       ├── src/tools.ts    # 7 tool handlers (zod-validated, delegate to @notes/db)
│       ├── src/index.ts    # Express 5 server, SSEServerTransport, keepalive
│       ├── scripts/build.mjs  # esbuild bundle (self-contained dist/index.js)
│       └── Dockerfile      # Cloud Run deploy
│
├── .scratch/               # Ad-hoc scripts (DB checks, MCP smoke tests)
├── docs/                   # Agent / process docs
│
├── ARCHITECTURE.md         # Full technical breakdown
├── CONTEXT.md              # Ubiquitous language (User, Note, Tag)
└── DESIGN.md               # shadcn design system (Vega + Neutral dark)
```

## MVP

| # | Issue | Status |
|---|---|---|
| 1 | Auth + Dashboard Shell | ✅ Shipped |
| 2 | Full Notes Feature (BlockNote editor, tags, full-text search) | ✅ Shipped |
| 3 | API Key Management (settings page, scoped keys) | ✅ Shipped |
| 4 | MCP Server (SSE, 7 tools, API key auth) | ✅ Shipped |
| 5 | AgentOnboard REST API (session-token auth, notes CRUD) | ✅ Shipped |

## Quick start

Prereqs: Node ≥ 20, pnpm 11, a Neon Postgres URL, a Firebase project with Google sign-in enabled.

```bash
# 1. Install
pnpm install

# 2. Configure env
cp .env.example .env.local
# Fill in DATABASE_URL, Firebase client keys, Firebase Admin SDK credentials.

# 3. Push the schema to your Neon DB
pnpm db:push

# 4. Run everything in parallel (web on :3000, mcp on :3001)
pnpm dev
```

Or run a single service:

```bash
pnpm dev:web      # Next.js only
pnpm dev:mcp      # MCP server only
```

## MCP server

The MCP server (`packages/mcp-server`) exposes your notes over the deprecated-but-still-widely-deployed SSE transport. It binds to `0.0.0.0:$MCP_PORT` (default `3001`) and authenticates every connection with a Bearer API key.

### Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET`  | `/sse` | Open the SSE stream (auth required). |
| `POST` | `/messages?sessionId=…` | Send JSON-RPC messages for a session. |
| `GET`  | `/healthz` | Liveness probe. |

### Tools

| Tool | Scope | Notes |
|---|---|---|
| `notes_list` | read | Optional `search`, `tagId`, `limit`, `offset` |
| `notes_get` | read | `noteId` |
| `notes_create` | read_write | `title`, optional `content`, `contentText`, `tagIds` |
| `notes_update` | read_write | `noteId`, partial title/content/tagIds |
| `notes_delete` | read_write | `noteId` |
| `tags_list` | read | — |
| `notes_by_tag` | read | `tagId`, optional `limit`, `offset` |

Read-only keys receive `isError: true` on the three write tools with the message
`API key scope 'read' is not allowed to perform write operations`.

### Connect from Claude Code

Drop a `.mcp.json` at the root of your project (or in `~/.claude/` for global):

```json
{
  "mcpServers": {
    "notes": {
      "url": "https://notes-mcp-966746046960.us-central1.run.app/sse",
      "headers": {
        "Authorization": "Bearer nt_…your key…"
      }
    }
  }
}
```

Or one-liner via the CLI (run from inside Claude Code):

```bash
claude mcp add notes \
  --transport sse \
  --url https://notes-mcp-966746046960.us-central1.run.app/sse \
  --header "Authorization: Bearer nt_…your key…"
```

Restart Claude Code after adding — the 7 `notes_*` tools then appear alongside its built-in tools. `/mcp` shows the live connection status.

### Connect from Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "notes": {
      "url": "https://notes-mcp-966746046960.us-central1.run.app/sse",
      "headers": { "Authorization": "Bearer nt_…your key…" }
    }
  }
}
```

(Local dev: swap the URL for `http://localhost:3001/sse`.)

Generate API keys from `/dashboard/settings` in the web app.

## REST API (AgentOnboard)

AI agents can interact with notes directly via REST endpoints, authenticated with an AgentOnboard session token. No API key needed.

### Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api` | API index — lists all available endpoints. |
| `GET` | `/api/notes` | List notes. Supports `?search=`, `?tagId=`, `?limit=`, `?offset=`. |
| `GET` | `/api/notes/:id` | Get a single note. |
| `POST` | `/api/notes` | Create a note. Body: `{ title (required), content?, contentText?, tagIds? }`. |
| `PATCH` | `/api/notes/:id` | Update a note. Body: `{ title?, content?, contentText?, tagIds? }`. |
| `DELETE` | `/api/notes/:id` | Delete a note. |
| `GET` | `/api/tags` | List tags. |

### Authentication

Pass an `X-Session-Token` header with a valid AgentOnboard session token:

```bash
curl -H "X-Session-Token: <session-token>" https://notes.aawej.in/api/notes
```

Users must sign up at the web app first. The session token maps to their email and grants full read/write access.

### Get a session token

```bash
aon token get
```

(Token is valid for 5 minutes.)

### Examples

```bash
# List notes with full-text search
curl -H "X-Session-Token: $TOKEN" "https://notes.aawej.in/api/notes?search=meeting"

# Create a note
curl -X POST -H "X-Session-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Grocery List","tagIds":["tag-uuid"]}' \
  https://notes.aawej.in/api/notes

# Update a note
curl -X PATCH -H "X-Session-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Updated Title"}' \
  https://notes.aawej.in/api/notes/<note-id>

# Delete a note
curl -X DELETE -H "X-Session-Token: $TOKEN" \
  https://notes.aawej.in/api/notes/<note-id>

# List tags
curl -H "X-Session-Token: $TOKEN" https://notes.aawej.in/api/tags
```

### Response format

All endpoints return JSON. Errors include an `error` field and appropriate HTTP status codes (400, 401, 404).

## Deployment (Cloud Run)

Two independent services, each with its own Dockerfile:

```bash
# Web
docker build -f apps/web/Dockerfile -t gcr.io/<project>/notes-web .
gcloud run deploy notes-web --image gcr.io/<project>/notes-web \
  --region us-central1 --allow-unauthenticated

# MCP (private — only the user's machine / Claude Desktop talks to it)
docker build -f packages/mcp-server/Dockerfile -t gcr.io/<project>/notes-mcp .
gcloud run deploy notes-mcp --image gcr.io/<project>/notes-mcp \
  --region us-central1 --no-allow-unauthenticated
```

The MCP service is configured with `min-instances: 1` to keep at least one warm instance for fast SSE handshakes.

## Scripts

| Script | What |
|---|---|
| `pnpm dev` / `dev:web` / `dev:mcp` | Dev servers (parallel by default) |
| `pnpm build` / `build:web` / `build:mcp` | Production builds |
| `pnpm start:mcp` | Run the built MCP server |
| `pnpm typecheck` | `tsc --noEmit` across all workspaces |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:push` | Apply the schema to the configured DB |
| `pnpm db:studio` | Open Drizzle Studio |

See `ARCHITECTURE.md` for the full technical breakdown (DB schema, auth flows, MCP protocol details, Cloud Run sizing, env vars) and `CONTEXT.md` for the ubiquitous language.