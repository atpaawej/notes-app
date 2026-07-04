import { FileText, Plus } from "lucide-react";

import { NoteCard } from "@/components/notes/note-card";
import { CreateNoteDialog } from "@/components/notes/create-note-dialog";
import { NotesListToolbar } from "@/components/notes/notes-list-toolbar";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { db, services } from "@notes/db";
import type { NoteWithTags } from "@notes/db";
import { requireUser } from "@/lib/auth/require-user";

type SearchParams = { q?: string; tag?: string };

export default async function NotesListPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const [user, params] = await Promise.all([
    requireUser(),
    searchParams,
  ]);

  const [{ items, total }, tags] = await Promise.all([
    services.listNotes(db, user.id, {
      search: params.q?.trim() || undefined,
      tagId: params.tag,
    }),
    services.listTags(db, user.id),
  ]);

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        <div className="flex flex-1 items-center justify-between gap-2">
          <div>
            <h1 className="text-base font-semibold tracking-tight">
              All Notes
            </h1>
            {user.displayName ? (
              <p className="text-xs text-muted-foreground">
                Welcome back, {user.displayName.split(" ")[0]}
              </p>
            ) : null}
          </div>
          <CreateNoteDialog>
            <Button size="sm">
              <Plus />
              New note
            </Button>
          </CreateNoteDialog>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <NotesListToolbar
          tags={tags}
          activeTagId={params.tag}
          total={total}
        />

        {items.length === 0 ? (
          <EmptyNotesState hasFilters={Boolean(params.q || params.tag)} />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((note) => (
              <NoteCard key={note.id} note={serializeNote(note)} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function serializeNote(note: NoteWithTags) {
  return {
    id: note.id,
    title: note.title,
    contentText: note.contentText,
    updatedAt: note.updatedAt,
    tags: note.tags.map((tag) => ({ id: tag.id, name: tag.name })),
  };
}

function EmptyNotesState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FileText />
        </EmptyMedia>
        <EmptyTitle>
          {hasFilters ? "No matching notes" : "No notes yet"}
        </EmptyTitle>
        <EmptyDescription>
          {hasFilters
            ? "Try removing the search or the tag filter."
            : "Notes you create will show up here. Get started by writing your first one."}
        </EmptyDescription>
      </EmptyHeader>
      {hasFilters ? null : (
        <EmptyContent>
          <CreateNoteDialog>
            <Button>
              <Plus />
              Create your first note
            </Button>
          </CreateNoteDialog>
        </EmptyContent>
      )}
    </Empty>
  );
}
