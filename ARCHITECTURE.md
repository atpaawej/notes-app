# Notes App — Architecture

## 1. Overview

A personal note-taking web application with MCP server support. Users sign in with Google OAuth (Firebase Auth), create/edit/delete notes using a Notion-like block editor (BlockNote), organize them with tags, and generate API keys for AI clients (Claude Desktop, Cursor, etc.) to interact with their notes programmatically via MCP tools.

Two Cloud Run services:
- **`notes-web`** — Next.js app (UI + server actions)
- **`notes-mcp`** — MCP server (SSE transport, API key auth)

Both services share a single Neon Postgres database and the `packages/db` module.

---

## 2. Project Structure

```
notes-app/
├── apps/
│   └── web/                        # Next.js (App Router)
│       ├── src/
│       │   ├── app/                # Pages
│       │   │   ├── layout.tsx      # Root layout (fonts, providers)
│       │   │   ├── page.tsx        # Landing / sign-in
│       │   │   ├── dashboard/
│       │   │   │   ├── layout.tsx  # Sidebar + main area
│       │   │   │   ├── page.tsx    # Notes list
│       │   │   │   ├── notes/
│       │   │   │   │   └── [id]/
│       │   │   │   │       └── page.tsx  # BlockNote editor
│       │   │   │   └── settings/
│       │   │   │       └── page.tsx  # Profile + API keys
│       │   │   └── api/
│       │   │       └── auth/       # Firebase session cookie endpoints
│       │   ├── components/
│       │   │   ├── ui/             # shadcn components (generated)
│       │   │   ├── notes/          # Note list, card, editor wrapper
│       │   │   ├── tags/           # Tag badge, tag picker
│       │   │   ├── auth/           # Sign-in button, auth provider
│       │   │   ├── api-keys/       # API key list, create dialog
│       │   │   └── layout/         # Sidebar, header, dashboard shell
│       │   ├── lib/
│       │   │   ├── auth/           # Firebase Admin init, session helpers
│       │   │   └── utils.ts        # Misc utilities (cn, etc.)
│       │   ├── hooks/              # React hooks (useAuth, useNotes, etc.)
│       │   └── styles/             # Global CSS, tailwind entry
│       ├── public/
│       ├── Dockerfile
│       ├── next.config.ts
│       ├── tailwind.config.ts
│       ├── components.json         # shadcn config
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   ├── db/                         # Shared database layer
│   │   ├── src/
│   │   │   ├── schema/             # Drizzle schema files
│   │   │   │   ├── index.ts        # Re-exports all tables
│   │   │   │   ├── users.ts
│   │   │   │   ├── notes.ts
│   │   │   │   ├── tags.ts
│   │   │   │   ├── notes-tags.ts
│   │   │   │   └── api-keys.ts
│   │   │   ├── services/           # Business logic modules
│   │   │   │   ├── index.ts        # Re-exports all services
│   │   │   │   ├── notes.ts        # CRUD + list + search
│   │   │   │   ├── tags.ts         # CRUD + list
│   │   │   │   ├── api-keys.ts     # Create, verify, list, delete
│   │   │   │   └── users.ts        # Find or create user
│   │   │   └── client.ts           # Drizzle client singleton
│   │   ├── drizzle.config.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── mcp-server/                 # MCP server
│       ├── src/
│       │   ├── index.ts            # SSE server entry point
│       │   ├── auth.ts             # API key auth middleware
│       │   └── tools/              # MCP tool handlers
│       │       ├── notes-list.ts
│       │       ├── notes-get.ts
│       │       ├── notes-create.ts
│       │       ├── notes-update.ts
│       │       ├── notes-delete.ts
│       │       ├── tags-list.ts
│       │       └── notes-by-tag.ts
│       ├── Dockerfile
│       ├── package.json
│       └── tsconfig.json
│
├── DESIGN.md                       # shadcn UI v4 design system (Neutral palette, dark mode)
├── shadcn-components-list.md       # All shadcn components available
├── CONTEXT.md                      # Domain language
├── pnpm-workspace.yaml
├── package.json                     # Root (empty, just workspaces)
├── .gitignore
└── .env.example
```

---

## 3. Database Schema

Database: **Neon Postgres**
ORM: **Drizzle ORM**
Naming: snake_case columns, camelCase JS properties (Drizzle default).
IDs: `uuid` generated with `gen_random_uuid()`.

### 3.1 `users`

| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `firebase_uid` | `text` | NOT NULL, UNIQUE |
| `email` | `text` | NOT NULL |
| `display_name` | `text` | |
| `avatar_url` | `text` | |
| `created_at` | `timestamp with time zone` | NOT NULL, default `now()` |
| `updated_at` | `timestamp with time zone` | NOT NULL, default `now()` |

### 3.2 `notes`

| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `user_id` | `uuid` | NOT NULL, FK → users.id, ON DELETE CASCADE |
| `title` | `text` | NOT NULL |
| `content` | `jsonb` | NOT NULL, default `'[]'` (ProseMirror JSON) |
| `content_text` | `text` | Plain text extracted from content (for search) |
| `created_at` | `timestamp with time zone` | NOT NULL, default `now()` |
| `updated_at` | `timestamp with time zone` | NOT NULL, default `now()` |

Indexes:
- `notes_user_id_idx` on `user_id`
- `notes_created_at_idx` on `created_at` DESC
- `notes_content_text_fts_idx` GIN index on `to_tsvector('english', content_text)` (for full-text search)

### 3.3 `tags`

| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `user_id` | `uuid` | NOT NULL, FK → users.id, ON DELETE CASCADE |
| `name` | `text` | NOT NULL |
| `created_at` | `timestamp with time zone` | NOT NULL, default `now()` |

Indexes / Constraints:
- UNIQUE on `(user_id, name)`

### 3.4 `notes_tags` (junction)

| Column | Type | Constraints |
|---|---|---|
| `note_id` | `uuid` | NOT NULL, FK → notes.id, ON DELETE CASCADE |
| `tag_id` | `uuid` | NOT NULL, FK → tags.id, ON DELETE CASCADE |

Constraints: PK on `(note_id, tag_id)`

### 3.5 `api_keys`

| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `user_id` | `uuid` | NOT NULL, FK → users.id, ON DELETE CASCADE |
| `name` | `text` | NOT NULL (user-friendly label, e.g. "Claude Desktop") |
| `key_hash` | `text` | NOT NULL (bcrypt hash of the raw key) |
| `key_prefix` | `text` | NOT NULL (first 8 chars for UI display, e.g. `nt_a1b2c3d4`) |
| `scope` | `text` | NOT NULL, CHECK scope IN ('read', 'read_write') |
| `last_used_at` | `timestamp with time zone` | |
| `created_at` | `timestamp with time zone` | NOT NULL, default `now()` |

---

## 4. Auth Flow

### 4.1 Firebase Auth Setup

Two Firebase configurations:
1. **Client-side Firebase SDK** — used in the browser for Google OAuth sign-in
2. **Firebase Admin SDK** — used in server actions + MCP server for token verification

**Client env vars (`NEXT_PUBLIC_FIREBASE_*`):**
```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

**Server env vars (never exposed to client):**
```
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=
```

### 4.2 Sign-In Flow

1. User clicks "Sign in with Google" button on `/` page
2. Firebase client SDK opens Google OAuth popup
3. On success, client receives a Firebase **ID token** (JWT)
4. Client calls a server action `signInWithFirebase(idToken)` which:
   a. Verifies the ID token using Firebase Admin SDK
   b. Looks up user by `firebase_uid`, creates if not found
   c. Creates a Firebase **session cookie** (HTTP-only, Secure, SameSite=Lax, expires in 14 days)
   d. Returns success — Next.js redirects to `/dashboard`

### 4.3 Session Verification

Server actions extract the session cookie, verify it with Firebase Admin SDK, and get the Firebase UID. The UID is used to look up the user from the database.

### 4.4 Sign-Out Flow

1. Client calls a server action that clears the session cookie
2. Client also signs out from Firebase client SDK
3. Redirect to `/`

### 4.5 Auth Guard

`/dashboard/*` pages check for a valid session. If none exists, redirect to `/`. Implemented as a middleware or in the root dashboard layout's server component.

---

## 5. Web App Architecture

### 5.1 Page Components

| Route | Component | Purpose |
|---|---|---|
| `/` | `app/page.tsx` | Landing page with "Sign in with Google" button |
| `/dashboard` | `app/dashboard/page.tsx` | Notes list with sidebar |
| `/dashboard/notes/[id]` | `app/dashboard/notes/[id]/page.tsx` | BlockNote editor |
| `/dashboard/settings` | `app/dashboard/settings/page.tsx` | Profile + API key management |

### 5.2 Component Tree

```
RootLayout
├── Providers (AuthProvider, ThemeProvider)
│   ├── AuthProvider            # Wraps Firebase Auth context
│   └── ThemeProvider           # Dark mode only

DashboardLayout
├── Sidebar (shadcn Sidebar)
│   ├── AppLogo
│   ├── NavItem: "All Notes"    # → /dashboard
│   ├── NavItem: "Tags"         # Expandable tag list
│   │   └── TagItem × N
│   ├── Separator
│   └── UserNav
│       ├── Avatar + DisplayName
│       └── DropdownMenu
│           ├── Settings        # → /dashboard/settings
│           └── Sign Out
│
├── MainArea
│   ├── NotesListPage
│   │   ├── SearchInput         # shadcn Input
│   │   ├── CreateNoteButton    # shadcn Dialog → title input + save
│   │   ├── TagFilter           # shadcn Badge filter chips
│   │   └── NotesGrid
│   │       └── NoteCard × N    # shadcn Card → title, preview, tags, date
│   │
│   ├── NoteEditorPage
│   │   ├── NoteTitle           # shadcn Input (large, borderless)
│   │   ├── BlockNote           # The block editor
│   │   ├── TagsBar             # shadcn Badge tags + add button
│   │   └── DeleteNoteButton    # shadcn AlertDialog
│   │
│   └── SettingsPage
│       ├── Tabs                # shadcn Tabs
│       │   ├── "Profile" tab
│       │   │   ├── Avatar (editable)
│       │   │   ├── Display Name
│       │   │   └── Email (read-only)
│       │   └── "API Keys" tab
│       │       ├── CreateApiKeyButton  # shadcn Dialog
│       │       ├── ApiKeyList
│       │       │   └── ApiKeyItem × N  # shadcn Card
│       │       │       ├── Name, prefix, scope badge, created date
│       │       │       ├── RevokeButton  # shadcn AlertDialog
│       │       │       └── last_used_at
│       │       └── Empty state  # shadcn Empty component
```

### 5.3 shadcn Component Usage

Every UI element must use a shadcn component. Here is the mapping:

| UI Need | shadcn Component |
|---|---|
| Page containers | `Card`, `CardHeader`, `CardContent` |
| Navigation sidebar | `Sidebar`, `SidebarContent`, `SidebarGroup`, `SidebarMenu`, `SidebarMenuItem` |
| Action triggers | `Button` (variants: default, destructive, outline, ghost) |
| Form inputs | `Input`, `Textarea`, `Label` |
| Dropdown menus | `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem` |
| Dialogs/Modals | `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle` |
| Delete confirmations | `AlertDialog`, `AlertDialogTrigger`, `AlertDialogContent`, `AlertDialogAction`, `AlertDialogCancel` |
| Tags | `Badge` (variants: default, secondary, outline) |
| Tabs for settings | `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` |
| Avatar | `Avatar`, `AvatarImage`, `AvatarFallback` |
| Separators | `Separator` |
| Notifications | `Sonner` (toast) |
| Loading states | `Skeleton` |
| Search/Select | `Command`, `CommandInput`, `CommandList`, `CommandGroup`, `CommandItem` |
| Small popups | `Popover`, `PopoverTrigger`, `PopoverContent` |
| Tooltips | `Tooltip`, `TooltipTrigger`, `TooltipContent` |
| Empty states | `Empty` |
| Data tables | `Table` (for API keys list), `DataTable` (if needed) |
| Right-click menus | `ContextMenu` |
| Slide panels | `Sheet` |
| Switch toggles | `Switch` |

### 5.4 Design System

- **Style:** Vega (default) from DESIGN.md
- **Palette:** Neutral (dark mode only)
- **Dark mode only** — no light mode toggle
- CSS variables from DESIGN.md's Neutral dark palette applied in `globals.css`
- Typography: Geist font (sans-serif headings + body) via `next/font`
- Radius: `--radius 0.625rem` (shadcn default)

### 5.5 BlockNote Editor

- **Package:** `@blocknote/react` + `@blocknote/core`
- Content is stored as **ProseMirror JSON** (`jsonb` column)
- An `onChange` handler extracts plain text into `content_text` for search
- `@blocknote/x-react` — use the shadcn/ui-compatible block note component
- Toolbar: shown at the top of the editor (not floating)
- Slash menu (`/`): enabled for block type switching
- Supported blocks: Paragraph, Heading (1-3), Bullet List, Numbered List, Code Block, Blockquote, Divider

### 5.6 Server Actions

All data mutations use Next.js Server Actions.

| Action | File | Purpose |
|---|---|---|
| `signInWithFirebase(idToken)` | `app/actions/auth.ts` | Create session cookie |
| `signOut()` | `app/actions/auth.ts` | Clear session cookie |
| `createNote(data)` | `app/actions/notes.ts` | Create a new note |
| `updateNote(id, data)` | `app/actions/notes.ts` | Update note title/content/tags |
| `deleteNote(id)` | `app/actions/notes.ts` | Delete a note |
| `createTag(name)` | `app/actions/tags.ts` | Create a new tag |
| `deleteTag(id)` | `app/actions/tags.ts` | Delete a tag |
| `createApiKey(name, scope)` | `app/actions/api-keys.ts` | Generate a new API key |
| `deleteApiKey(id)` | `app/actions/api-keys.ts` | Revoke an API key |

Each server action:
1. Reads and verifies the Firebase session cookie
2. Looks up the user by Firebase UID
3. Calls the appropriate `packages/db` service
4. Returns the result

Data fetching (reads) can use server components directly with `async` functions that call db services.

### 5.7 Client-Side Data Flow

- **Auth state:** Firebase Auth `onAuthStateChanged` listener in `AuthProvider` context
- **Notes list:** Fetched in the server component, revalidated after mutations via `revalidatePath('/dashboard')`
- **Note detail:** Fetched in the server component using the note ID param
- **Tags:** Fetched in the sidebar server component
- **API keys:** Fetched in the settings page server component

---

## 6. Database Services (`packages/db/src/services/`)

Each service file exports pure async functions. They accept a Drizzle instance and required params. The caller (server action or MCP tool) is responsible for providing the Drizzle instance and user context.

### 6.1 `services/notes.ts`

```
function listNotes(db, userId: string, filters?: { search?, tagId?, limit?, offset? }) → { notes: Note[], total: number }
function getNote(db, noteId: string) → Note | null
function createNote(db, userId: string, data: { title, content?, tagIds? }) → Note
function updateNote(db, noteId: string, data: { title?, content?, tagIds? }) → Note
function deleteNote(db, noteId: string) → void
function searchNotes(db, userId: string, query: string, pagination?) → { notes: Note[], total: number }
```

### 6.2 `services/tags.ts`

```
function listTags(db, userId: string) → Tag[]
function createTag(db, userId: string, name: string) → Tag
function deleteTag(db, tagId: string) → void
function getNotesByTag(db, tagId: string, pagination?) → { notes: Note[], total: number }
```

### 6.3 `services/api-keys.ts`

```
function createApiKey(db, userId: string, data: { name, scope }) → { apiKey: ApiKey, rawKey: string }
function listApiKeys(db, userId: string) → ApiKey[]
function deleteApiKey(db, keyId: string) → void
function verifyApiKey(db, rawKey: string) → { user: User, scope: string } | null
```

- `createApiKey`: generates `nt_${randomHex(32)}`, bcrypt hashes it, stores hash + prefix
- `verifyApiKey`: iterates all keys (or uses a bloom filter), compares with bcrypt. Updates `last_used_at`.
- The raw key is returned exactly once at creation time (shown in a Dialog, never stored)

### 6.4 `services/users.ts`

```
function findOrCreateUser(db, firebaseUid: string, data: { email, displayName?, avatarUrl? }) → User
function getUserByFirebaseUid(db, firebaseUid: string) → User | null
```

---

## 7. MCP Server (`packages/mcp-server`)

### 7.1 Setup

- **Framework:** `@modelcontextprotocol/sdk` (MCP SDK)
- **Transport:** SSE (HTTP server)
- **Port:** Read from `MCP_PORT` env var, default `3001`
- **Server name:** `notes-mcp`

### 7.2 Auth Middleware

Every SSE connection and every tool invocation must authenticate via API key:

1. Client connects with `Authorization: Bearer nt_<key>` header
2. Middleware extracts the key, calls `verifyApiKey()` from `packages/db`
3. If valid, stores user context on the session; rejects otherwise
4. For read-only keys, `notes_create`, `notes_update`, `notes_delete` tools return 403

### 7.3 MCP Tools

Each tool handler:
1. Reads the authenticated user from session context
2. Calls the corresponding service from `packages/db`
3. Returns the result

| Tool | Input | Output | Requires scope |
|---|---|---|---|
| `notes_list` | `{ search?: string, tagId?: string, limit?: number, offset?: number }` | `{ notes: Note[], total: number }` | read |
| `notes_get` | `{ noteId: string }` | `{ note: Note }` | read |
| `notes_create` | `{ title: string, content?: any, tagIds?: string[] }` | `{ note: Note }` | read_write |
| `notes_update` | `{ noteId: string, title?: string, content?: any, tagIds?: string[] }` | `{ note: Note }` | read_write |
| `notes_delete` | `{ noteId: string }` | `{ success: boolean }` | read_write |
| `tags_list` | `{}` | `{ tags: Tag[] }` | read |
| `notes_by_tag` | `{ tagId: string, limit?: number, offset?: number }` | `{ notes: Note[], total: number }` | read |

### 7.4 SSE Keepalive

Cloud Run has a 60-minute HTTP timeout. The MCP server sends a periodic keepalive ping (every 30 seconds) to keep the SSE connection alive.

### 7.5 Dockerfile (`packages/mcp-server/Dockerfile`)

```dockerfile
FROM node:22-slim AS base
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/db/ ./packages/db/
COPY packages/mcp-server/ ./packages/mcp-server/
RUN npm i -g pnpm && pnpm install --frozen-lockfile
RUN pnpm --filter @notes/db build
RUN pnpm --filter @notes/mcp-server build
EXPOSE 3001
CMD ["node", "packages/mcp-server/dist/index.js"]
```

---

## 8. Deployment (Cloud Run)

### 8.1 `notes-web` Service

- **Region:** `us-central1`
- **CPU:** 1 vCPU
- **Memory:** 512 MB
- **Min instances:** 0 (scale to zero)
- **Max instances:** 10
- **Port:** `3000` (Next.js default)
- **Env vars:** All Firebase + DATABASE_URL

Dockerfile multi-stage build:

```dockerfile
FROM node:22-slim AS base
WORKDIR /app
COPY . .
RUN npm i -g pnpm
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @notes/db build
RUN pnpm --filter @notes/web build
EXPOSE 3000
CMD ["pnpm", "--filter", "@notes/web", "start"]
```

### 8.2 `notes-mcp` Service

- **Region:** `us-central1`
- **CPU:** 1 vCPU
- **Memory:** 256 MB
- **Min instances:** 1 (keep warm for SSE)
- **Max instances:** 5
- **Port:** `3001`
- **Env vars:** `DATABASE_URL`, `MCP_PORT=3001`

### 8.3 Build & Deploy

```bash
# Build both services
docker build -f apps/web/Dockerfile -t gcr.io/<project>/notes-web .
docker build -f packages/mcp-server/Dockerfile -t gcr.io/<project>/notes-mcp .

# Deploy
gcloud run deploy notes-web --image gcr.io/<project>/notes-web \
  --platform managed --region us-central1 \
  --allow-unauthenticated

gcloud run deploy notes-mcp --image gcr.io/<project>/notes-mcp \
  --platform managed --region us-central1 \
  --no-allow-unauthenticated
```

---

## 9. Environment Variables

### 9.1 `.env.example` (root)

```bash
# Neon Postgres
DATABASE_URL=postgresql://...

# Firebase Admin SDK (server-side, both web and mcp)
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=

# Firebase Client SDK (web only, prefix with NEXT_PUBLIC_)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# App URL (for CORS and redirects)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# MCP Server (mcp only)
MCP_PORT=3001
```

---

## 10. Getting Started

```bash
# 1. Install dependencies
pnpm install

# 2. Set up database
cd packages/db
pnpm drizzle-kit generate
pnpm drizzle-kit push

# 3. Run web app
cd apps/web
pnpm dev

# 4. Run MCP server (separate terminal)
cd packages/mcp-server
pnpm dev
```

---

## 11. Scripts

### Root `package.json`

```json
{
  "private": true,
  "scripts": {
    "dev": "pnpm --parallel -r dev",
    "build": "pnpm -r build",
    "db:generate": "pnpm --filter @notes/db generate",
    "db:push": "pnpm --filter @notes/db push",
    "db:studio": "pnpm --filter @notes/db studio"
  }
}
```

### Package Names

- `@notes/web` — `apps/web`
- `@notes/db` — `packages/db`
- `@notes/mcp-server` — `packages/mcp-server`

---

## 12. Implementation Order (Recommended)

| Step | What | Dependencies |
|---|---|---|
| 1 | Initialize pnpm monorepo, create package scaffolds | None |
| 2 | Set up Drizzle schema + migrations + Neon DB connection | Step 1 |
| 3 | Implement `packages/db` services | Step 2 |
| 4 | Set up Firebase Admin SDK + scaffolding in `apps/web` | Step 1 |
| 5 | Implement auth flow (sign-in server action, session cookie, middleware) | Steps 3, 4 |
| 6 | Set up shadcn/ui + Tailwind + DESIGN.md theme (dark mode) | Step 1 |
| 7 | Build dashboard layout (sidebar + main area) | Steps 5, 6 |
| 8 | Build notes list page (search, filter by tag, note cards) | Steps 3, 7 |
| 9 | Build note editor page (BlockNote, title, tags, delete) | Steps 3, 7 |
| 10 | Build settings page (profile + API key management) | Steps 3, 7 |
| 11 | Build MCP server (tools + API key auth + SSE) | Step 3 |
| 12 | Dockerfiles + Cloud Run deployment config | Steps 2, 11 |
