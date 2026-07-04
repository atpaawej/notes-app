# Notes App

A personal note-taking app with a Notion-like block editor (BlockNote), tag-based organization, full-text search, API-key-scoped access, and an MCP server so AI clients (Claude Desktop, Cursor, etc.) can read and write your notes.

## Stack

| Layer | Technology |
|---|---|
| **Web app** | Next.js 16 (App Router) + TypeScript + React 19 |
| **Editor** | BlockNote (ProseMirror blocks, stored as JSONB + plain text for FTS) |
| **UI** | shadcn/ui v4, dark mode only, Neutral palette |
| **Database** | Neon Postgres via Drizzle ORM |
| **Auth (web)** | Firebase Auth (Google OAuth) + Firebase session cookies |
| **Auth (MCP)** | API keys (`nt_…`) hashed with bcrypt, `read` / `read_write` scopes |
| **MCP** | `@modelcontextprotocol/sdk` v1.29, SSE transport |
| **Deploy** | Two independent Cloud Run services: `notes-web` and `notes-mcp` |

## Project structure

```
notes-app/
├── apps/
│   └── web/                # Next.js app (App Router, server actions, shadcn UI)
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

### Connect from Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "notes": {
      "url": "http://localhost:3001/sse",
      "headers": { "Authorization": "Bearer nt_…your key…" }
    }
  }
}
```

Generate API keys from `/dashboard/settings` in the web app.

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