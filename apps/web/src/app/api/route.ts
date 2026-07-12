import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const endpoints = [
  {
    method: "GET",
    path: "/api",
    description: "API index — lists all available endpoints.",
  },
  {
    method: "GET",
    path: "/api/notes",
    description:
      "List the authenticated user's notes. Supports ?search=, ?tagId=, ?limit=, ?offset= query params.",
  },
  {
    method: "GET",
    path: "/api/notes/:id",
    description: "Fetch a single note by its UUID.",
  },
  {
    method: "POST",
    path: "/api/notes",
    description:
      "Create a new note. Body: { title (required), content?, contentText?, tagIds? }",
  },
  {
    method: "PATCH",
    path: "/api/notes/:id",
    description:
      "Update an existing note. Body: { title?, content?, contentText?, tagIds? }",
  },
  {
    method: "DELETE",
    path: "/api/notes/:id",
    description: "Delete a note by its UUID.",
  },
  {
    method: "GET",
    path: "/api/tags",
    description: "List the authenticated user's tags.",
  },
];

export async function GET() {
  return NextResponse.json({ endpoints });
}
