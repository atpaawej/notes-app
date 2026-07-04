# Notes App

A personal note-taking app with a Notion-like editor (BlockNote), tag organization, full-text search, and an MCP server for AI client access.

## Stack

| Layer | Technology |
|---|---|
| **App** | Next.js (App Router) + TypeScript |
| **Database** | Neon Postgres via Drizzle ORM |
| **Auth** | Firebase Auth (Google OAuth) |
| **Editor** | BlockNote (ProseMirror blocks) |
| **UI** | shadcn/ui v4, dark mode |
| **MCP** | @modelcontextprotocol/sdk, SSE transport |
| **Deploy** | GCP Cloud Run |

## Project Structure

```
apps/web/          → Next.js app (pages, components, server actions)
packages/db/       → Drizzle schema + business logic services
packages/mcp-server/ → MCP server (SSE, API key auth, tools)
```

## MVP Issues

| # | Issue | Status |
|---|---|---|
| 1 | Auth + Dashboard Shell | ⬜ |
| 2 | Full Notes Feature | ⬜ |
| 3 | API Key Management | ⬜ |
| 4 | MCP Server | ⬜ |

## Quick Start

```bash
pnpm install
pnpm db:push
pnpm dev
```

See `ARCHITECTURE.md` for full documentation.
