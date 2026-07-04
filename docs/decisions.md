# Notes App — Grilling Decisions

**Date:** 2026-07-04

## Stack

| Category | Decision |
|---|---|
| **App** | Next.js web app on GCP Cloud Run |
| **Monorepo** | pnpm workspaces (`apps/web` + `packages/mcp-server`) |
| **Database** | Neon Postgres |
| **ORM** | Drizzle ORM |
| **Auth** | Firebase Auth / Google OAuth |
| **MCP Transport** | SSE (standalone HTTP server) |
| **MCP Auth** | API keys (user-managed, per-key scope: read-only / read-write) |
| **Editor** | BlockNote (Notion-like block editor) |
| **UI** | shadcn/ui v4, dark mode only, Neutral palette |
| **Deploy** | Two Cloud Run services: `notes-web` + `notes-mcp` |

## v1 Features

- Create / read / update / delete notes (markdown body)
- Tags (flat labels, attach zero or more per note)
- Firebase Auth with Google OAuth
- API key management from dashboard settings
- 7 MCP tools: `notes_list`, `notes_get`, `notes_create`, `notes_update`, `notes_delete`, `tags_list`, `notes_by_tag`

## Routes

| Path | Page |
|---|---|
| `/` | Landing / sign-in |
| `/dashboard` | Main app — sidebar + notes list |
| `/dashboard/notes/:id` | View / edit note (BlockNote editor) |
| `/dashboard/settings` | Profile, API keys, appearance |

## Frontend

- All components from shadcn/ui (Sidebar, Sheet, Dialog, Dropdown, Badge, etc.)
- DESIGN.md and shadcn-components-list.md committed to repo root
- Only shadcn components — no custom UI primitives

## Domain

- **User:** Person with an account who owns notes
- **Note:** Titled markdown content, owned by a User
- **Tag:** Flat label attached to zero or more Notes (no hierarchy)
