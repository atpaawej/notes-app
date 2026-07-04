# PRD: Notes App MVP

## Problem Statement

Users need a personal note-taking application that stores rich-text notes in the cloud with Google sign-in, organizes them by tags, and exposes their notes to AI coding assistants (Claude Desktop, Cursor, etc.) via an MCP server so they can reference and manipulate their notes without leaving their AI tool.

## Solution

A Next.js web application with Firebase Auth (Google OAuth), a Notion-like block editor (BlockNote), tag-based organization, and a companion MCP server (SSE transport) that lets AI clients read and write notes using API key authentication. Both are deployed on GCP Cloud Run and backed by Neon Postgres.

## User Stories

1. As a user, I want to sign in with my Google account, so that I don't need to create yet another username and password.
2. As a user, I want to see a clean dashboard with all my notes listed, so that I can quickly find and open any note.
3. As a user, I want to create a new note with a title and rich content, so that I can capture my thoughts.
4. As a user, I want to write notes using a Notion-like block editor with slash commands (headings, lists, code blocks, quotes, dividers), so that my notes are well-structured and formatted.
5. As a user, I want to edit existing notes, so that I can update information over time.
6. As a user, I want to delete notes I no longer need, so that my dashboard stays organized.
7. As a user, I want to add tags to my notes, so that I can categorize and filter them.
8. As a user, I want to filter my notes by tag from the sidebar, so that I can see only notes in a specific category.
9. As a user, I want to search my notes by text, so that I can find notes even when I don't remember which tag they have.
10. As a user, I want a dark-mode-only interface that looks polished and modern, so that it is comfortable to use at any time of day.
11. As a user, I want to generate API keys from my dashboard settings, so that AI tools can access my notes.
12. As a user, I want to choose whether an API key is read-only or read-write, so that I can grant limited access to less trusted integrations.
13. As a user, I want to revoke an API key at any time, so that I can cut off access if a key is compromised or no longer needed.
14. As a user, I want my AI coding assistant to list all my notes via MCP, so that I can reference them during development.
29. As a user, I want my AI assistant to search my notes by text via MCP, so that it can find relevant information.
30. As a user, I want my AI assistant to retrieve a single note by ID via MCP, so that it can read the full content.
31. As a user, I want my AI assistant to create new notes via MCP, so that I can capture thoughts without leaving my AI tool.
32. As a user, I want my AI assistant to update existing notes via MCP, so that it can record action items or summaries on my behalf.
33. As a user, I want my AI assistant to delete notes via MCP, so that it can clean up temporary notes I asked it to create.
34. As a user, I want my AI assistant to list my tags via MCP, so that it can organize notes into the right categories.
35. As a user, I want my AI assistant to get notes by a specific tag via MCP, so that it can scope its work to a project or area.

## Seams

### Primary Seam: `packages/db/src/services/`

The business logic lives in four service modules:
- `notes.ts` — `createNote`, `getNote`, `updateNote`, `deleteNote`, `listNotes`, `searchNotes`
- `tags.ts` — `createTag`, `listTags`, `deleteTag`, `getNotesByTag`
- `api-keys.ts` — `createApiKey`, `listApiKeys`, `deleteApiKey`, `verifyApiKey`
- `users.ts` — `findOrCreateUser`, `getUserByFirebaseUid`

Each function accepts a Drizzle instance as its first argument. Tests create an isolated database, call the function, and assert on the returned data. This seam covers all business logic — CRUD invariants, tag-note relationships, API key hashing/verification, and auth lookups — without needing HTTP, cookies, or headers.

### Secondary Seams (low test priority)

- **Server actions** — thin auth + delegation wrappers. Test the auth guard / session cookie logic, not the business logic (already tested at seam 1).
- **MCP tool handlers** — thin auth + delegation wrappers. Test API key scope enforcement at this seam if desired.

## Implementation Decisions

- Monorepo with pnpm workspaces: `apps/web` (Next.js), `packages/db` (Drizzle schema + services), `packages/mcp-server` (MCP SSE server).
- All UI components from shadcn/ui v4 — Dark mode only, Neutral palette, Vega style.
- BlockNote editor stores notes as ProseMirror JSON (`jsonb` column). A `content_text` column stores extracted plain text for full-text search (GIN index on `to_tsvector`).
- Firebase Auth with Google OAuth. Firebase session cookies (HTTP-only) for SSR auth. Firebase Admin SDK for server-side verification.
- API keys generated as `nt_` + 32 random hex chars. Bcrypt hashed in DB. Raw key shown once at creation. Per-key scope: `read` or `read_write`.
- MCP server uses SSE transport with periodic keepalive pings (every 30s) for Cloud Run compatibility.
- Server Actions for all data mutations. Server components for data fetching (revalidated via `revalidatePath`).
- Both services deployed to GCP Cloud Run, each with its own Dockerfile.
- `packages/db` is shared by both web and mcp-server — single source of truth for the schema and business logic.

### Schema Overview

- `users` — id (uuid), firebase_uid (unique), email, display_name, avatar_url, timestamps
- `notes` — id (uuid), user_id (FK), title, content (jsonb), content_text, timestamps. GIN index on content_text for FTS.
- `tags` — id (uuid), user_id (FK), name. Unique(user_id, name).
- `notes_tags` — note_id (FK), tag_id (FK). PK(note_id, tag_id).
- `api_keys` — id (uuid), user_id (FK), name, key_hash, key_prefix, scope, last_used_at, created_at.

### MCP Tools Contract

| Tool | Input | Output |
|---|---|---|
| `notes_list` | `{ search?, tagId?, limit?, offset? }` | `{ notes: Note[], total: number }` |
| `notes_get` | `{ noteId }` | `{ note: Note }` |
| `notes_create` | `{ title, content?, tagIds? }` | `{ note: Note }` |
| `notes_update` | `{ noteId, title?, content?, tagIds? }` | `{ note: Note }` |
| `notes_delete` | `{ noteId }` | `{ success: boolean }` |
| `tags_list` | `{}` | `{ tags: Tag[] }` |
| `notes_by_tag` | `{ tagId, limit?, offset? }` | `{ notes: Note[], total: number }` |

## Testing Decisions

- **Good test**: calls a service function with a known database state, asserts on the returned data. No mocks of Drizzle or DB — use a real test database (Drizzle migrate + push per test suite run).
- **Modules tested**: all `packages/db/src/services/` modules. One service module per test file.
- **What to test**: CRUD invariants (creating a note returns it with correct fields), edge cases (deleting a note cascades to junction table), constraints (duplicate tag name per user fails), API key verification (valid key returns user, invalid returns null, wrong scope is denied).
- **What not to test**: server action cookie parsing, MCP transport details — these are framework boilerplate tested by Next.js and MCP SDK.

## Out of Scope

- Public / shared notes (multi-user collaboration)
- Mobile native apps (PWA only via web)
- Rich text file uploads / image hosting
- Offline mode
- Note version history
- Export to PDF / other formats
- Team / workspace features
- Light mode

## Further Notes

- The user will provide Firebase client keys and Firebase Admin SDK JSON key manually after scaffolding.
- DISCORD.md and shadcn-components-list.md are committed to the repo root as reference for the design system.
- See `ARCHITECTURE.md` for the full technical breakdown including component tree, env vars, Dockerfiles, and implementation order.
