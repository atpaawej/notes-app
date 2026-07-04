import { notFound } from "next/navigation";

import { NoteEditor } from "@/components/notes/note-editor";
import { db, services } from "@notes/db";
import { requireUser } from "@/lib/auth/require-user";

export default async function NoteEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, user] = await Promise.all([params, requireUser()]);

  const note = await services.getNote(db, id);

  if (!note || note.userId !== user.id) {
    notFound();
  }

  const allTags = await services.listTags(db, user.id);

  return (
    <NoteEditor
      noteId={note.id}
      initialTitle={note.title}
      initialContent={note.content}
      initialTagIds={note.tags.map((tag) => tag.id)}
      initialUpdatedAt={note.updatedAt.toISOString()}
      allTags={allTags.map((tag) => ({ id: tag.id, name: tag.name }))}
    />
  );
}
