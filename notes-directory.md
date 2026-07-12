# Notes

[notes.aawej.in](https://notes.aawej.in)

A personal notebook that you actually own. AI agents can read and write notes using an AgentOnboard session token — no separate API key needed.

## Overview

Notes is a personal note-taking app with a block editor (BlockNote), tag-based organisation, full-text search, and programmatic access via both MCP (with API keys) and REST (with AgentOnboard session tokens).

| Feature | Description |
|---|---|
| **Sign-in** | Google OAuth via Firebase. One click, no password. |
| **Editor** | BlockNote — paragraphs, headings, lists, code blocks, quotes. Press `/` to switch. |
| **Tags** | Flat labels for grouping notes. Filter by tag to see related notes. |
| **Full-text search** | Search across all note content, powered by Postgres full-text search. |
| **REST API** | AI agents can call Notes directly with an AgentOnboard session token. |

## Prerequisites

- A Notes account — sign up at [notes.aawej.in](https://notes.aawej.in) with Google
- An AgentOnboard session token (run `aon token get`)

Your Notes account email must match the email in your session token. There is no auto-provisioning — you must sign up first.

## Base URL

```
https://notes.aawej.in
```

## Authentication

Pass your session token in the `X-Session-Token` header on every request.

```
X-Session-Token: aons_<your-token>
```

Session tokens expire after 5 minutes. Get a fresh one with `aon token get`.

## Rate limiting

None currently.

## Endpoints

### API index

```http
GET /api
```

Returns a list of all available endpoints with descriptions.

**Response:**
```json
{
  "endpoints": [
    { "method": "GET",  "path": "/api",          "description": "API index — lists all available endpoints." },
    { "method": "GET",  "path": "/api/notes",     "description": "List the authenticated user's notes." },
    { "method": "GET",  "path": "/api/notes/:id", "description": "Fetch a single note by its UUID." },
    { "method": "POST", "path": "/api/notes",     "description": "Create a new note." },
    { "method": "PATCH",  "path": "/api/notes/:id", "description": "Update an existing note." },
    { "method": "DELETE","path": "/api/notes/:id", "description": "Delete a note by its UUID." },
    { "method": "GET",  "path": "/api/tags",      "description": "List the authenticated user's tags." }
  ]
}
```

### List notes

```http
GET /api/notes
```

Query parameters:

| Param | Type | Description |
|---|---|---|
| `search` | string | Free-text search across title and plain-text body |
| `tagId` | UUID | Filter notes by tag |
| `limit` | integer (1-500) | Max notes to return (default 100) |
| `offset` | integer | Pagination offset (default 0) |

**Response:** `200 OK`
```json
{
  "notes": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Meeting notes",
      "content": [...],
      "contentText": "Discussed Q3 roadmap...",
      "createdAt": "2026-07-12T05:34:00.889Z",
      "updatedAt": "2026-07-12T05:34:14.142Z",
      "tags": [
        {
          "id": "660e8400-e29b-41d4-a716-446655440001",
          "name": "work",
          "createdAt": "2026-07-10T12:00:00.000Z"
        }
      ]
    }
  ],
  "total": 1
}
```

### Get a note

```http
GET /api/notes/:id
```

**Response:** `200 OK`
```json
{
  "note": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Meeting notes",
    "content": [...],
    "contentText": "Discussed Q3 roadmap...",
    "createdAt": "2026-07-12T05:34:00.889Z",
    "updatedAt": "2026-07-12T05:34:14.142Z",
    "tags": []
  }
}
```

**Error:** `404 Not Found`
```json
{ "error": "Note not found" }
```

### Create a note

```http
POST /api/notes
Content-Type: application/json

{
  "title": "Grocery List",
  "tagIds": ["660e8400-e29b-41d4-a716-446655440001"]
}
```

Body fields:

| Field | Type | Required | Description |
|---|---|---|---|
| `title` | string | ✅ | 1-500 characters |
| `content` | any | — | BlockNote / ProseMirror JSON document |
| `contentText` | string | — | Plain-text representation for search |
| `tagIds` | UUID[] | — | Tag UUIDs to assign |

**Response:** `201 Created`
```json
{
  "note": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Grocery List",
    ...
  }
}
```

### Update a note

```http
PATCH /api/notes/:id
Content-Type: application/json

{
  "title": "Updated title"
}
```

All body fields are optional. Only provided fields are updated.

**Response:** `200 OK`
```json
{
  "note": { "...": "..." }
}
```

### Delete a note

```http
DELETE /api/notes/:id
```

**Response:** `200 OK`
```json
{ "success": true }
```

### List tags

```http
GET /api/tags
```

**Response:** `200 OK`
```json
{
  "tags": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "name": "work",
      "createdAt": "2026-07-10T12:00:00.000Z"
    }
  ]
}
```

## Error responses

| Status | Meaning |
|---|---|
| `400` | Invalid input — missing or malformed fields |
| `401` | Missing, invalid, or expired session token |
| `404` | Note or tag not found |
| `500` | Server configuration error |

**401 — missing token:**
```json
{ "error": "Missing X-Session-Token header" }
```

**401 — invalid token:**
```json
{ "error": "Invalid session token: Token rejected" }
```

**401 — user not found:**
```json
{ "error": "User not found — sign up at https://notes.aawej.in first" }
```

## Examples

```bash
# Get a session token
aon token get

# List notes with search
curl -H "X-Session-Token: $TOKEN" \
  "https://notes.aawej.in/api/notes?search=meeting&limit=5"

# Create a note
curl -X POST -H "X-Session-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Shopping list","tagIds":[]}' \
  "https://notes.aawej.in/api/notes"

# Update a note
curl -X PATCH -H "X-Session-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"contentText":"Milk, eggs, bread"}' \
  "https://notes.aawej.in/api/notes/550e8400-e29b-41d4-a716-446655440000"

# Delete a note
curl -X DELETE -H "X-Session-Token: $TOKEN" \
  "https://notes.aawej.in/api/notes/550e8400-e29b-41d4-a716-446655440000"

# List tags
curl -H "X-Session-Token: $TOKEN" \
  "https://notes.aawej.in/api/tags"
```

## Limits

- Note title: 1–500 characters
- Note body: unlimited (stored as JSONB)
- Pagination: max 500 notes per page
- Tags: unlimited per note
- Session tokens: valid for 5 minutes (refresh with `aon token get`)

## SDK

No SDK required. Works with any HTTP client (curl, fetch, Python requests, etc.).

## Support

- [Source code](https://github.com/atpaawej/notes-app)
- [Notes website](https://notes.aawej.in)
