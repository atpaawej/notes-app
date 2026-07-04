"use client";

import { BlockNoteEditor } from "@blocknote/core";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { Check, ChevronUp, Loader2 } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";

import {
  SelectedTags,
  TagPicker,
  type TagOption,
} from "@/components/notes/tag-picker";
import { DeleteNoteDialog } from "@/components/notes/delete-note-dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { updateNoteAction } from "@/app/actions/notes";

type Props = {
  noteId: string;
  initialTitle: string;
  initialContent: unknown;
  initialTagIds: string[];
  initialUpdatedAt: string;
  allTags: TagOption[];
};

type SaveStatus =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; at: Date }
  | { kind: "error"; message: string };

const AUTOSAVE_DELAY_MS = 1500;

export function NoteEditor({
  noteId,
  initialTitle,
  initialContent,
  initialTagIds,
  initialUpdatedAt,
  allTags,
}: Props) {
  const [title, setTitle] = React.useState(initialTitle);
  const [tagIds, setTagIds] = React.useState(initialTagIds);
  const [status, setStatus] = React.useState<SaveStatus>({
    kind: "saved",
    at: new Date(initialUpdatedAt),
  });
  const [editor, setEditor] = React.useState<BlockNoteEditor | null>(null);

  const initialContentRef = React.useRef(initialContent);
  React.useEffect(() => {
    initialContentRef.current = initialContent;
  }, [initialContent]);

  React.useEffect(() => {
    const instance = BlockNoteEditor.create({
      initialContent:
        Array.isArray(initialContentRef.current) &&
        initialContentRef.current.length > 0
          ? (initialContentRef.current as never[])
          : undefined,
    });
    setEditor(instance);
    return () => {
      instance._tiptapEditor?.destroy();
    };
  }, []);

  const editorRef = React.useRef<BlockNoteEditor | null>(null);
  React.useEffect(() => {
    editorRef.current = editor;
  });

  const lastSavedSignature = React.useRef(
    JSON.stringify({
      title,
      content: initialContent ?? [],
      tagIds: [...initialTagIds].sort(),
    }),
  );

  const pendingSaveTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const inflightSave = React.useRef<AbortController | null>(null);

  const persist = React.useCallback(
    async (next: { title: string; content: unknown; tagIds: string[] }) => {
      if (inflightSave.current) {
        inflightSave.current.abort();
      }
      const controller = new AbortController();
      inflightSave.current = controller;

      setStatus({ kind: "saving" });

      try {
        const result = await updateNoteAction({
          noteId,
          title: next.title,
          content: next.content,
          tagIds: next.tagIds,
        });

        if (controller.signal.aborted) return;

        if (!result.ok) {
          setStatus({ kind: "error", message: result.error });
          toast.error(result.error);
          return;
        }

        lastSavedSignature.current = JSON.stringify({
          title: next.title,
          content: next.content,
          tagIds: [...next.tagIds].sort(),
        });
        setStatus({ kind: "saved", at: new Date() });
      } catch (err) {
        if (controller.signal.aborted) return;
        const message =
          err instanceof Error ? err.message : "Failed to save note";
        setStatus({ kind: "error", message });
        toast.error(message);
      } finally {
        if (inflightSave.current === controller) {
          inflightSave.current = null;
        }
      }
    },
    [noteId],
  );

  const scheduleSave = React.useCallback(
    (next: { title: string; content: unknown; tagIds: string[] }) => {
      if (pendingSaveTimeout.current) {
        clearTimeout(pendingSaveTimeout.current);
      }
      pendingSaveTimeout.current = setTimeout(() => {
        pendingSaveTimeout.current = null;
        void persist(next);
      }, AUTOSAVE_DELAY_MS);
    },
    [persist],
  );

  const flushSave = React.useCallback(() => {
    if (pendingSaveTimeout.current) {
      clearTimeout(pendingSaveTimeout.current);
      pendingSaveTimeout.current = null;
    }
    const current = editorRef.current;
    if (!current) return;
    void persist({
      title,
      content: current.document,
      tagIds,
    });
  }, [persist, tagIds, title]);

  React.useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      const current = editorRef.current;
      if (!current) return;
      const signature = JSON.stringify({
        title,
        content: current.document,
        tagIds: [...tagIds].sort(),
      });
      if (signature !== lastSavedSignature.current) {
        event.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [tagIds, title]);

  React.useEffect(() => {
    return () => {
      if (pendingSaveTimeout.current) {
        clearTimeout(pendingSaveTimeout.current);
      }
      if (inflightSave.current) {
        inflightSave.current.abort();
      }
    };
  }, []);

  const handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value;
    setTitle(next);
    const current = editorRef.current;
    if (!current) return;
    scheduleSave({
      title: next,
      content: current.document,
      tagIds,
    });
  };

  const handleEditorChange = React.useCallback(() => {
    const current = editorRef.current;
    if (!current) return;
    scheduleSave({
      title,
      content: current.document,
      tagIds,
    });
  }, [scheduleSave, tagIds, title]);

  const handleEditorBlur = React.useCallback(() => {
    flushSave();
  }, [flushSave]);

  const handleTagsChange = (next: string[]) => {
    setTagIds(next);
    const current = editorRef.current;
    if (!current) return;
    scheduleSave({
      title,
      content: current.document,
      tagIds: next,
    });
  };

  const tagsAsOptions = allTags;

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        <div className="flex flex-1 items-center gap-2">
          <Link
            href="/dashboard"
            className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            All Notes
          </Link>
          <span className="text-xs text-muted-foreground">/</span>
          <span className="truncate text-sm font-medium">
            {title.trim() || "Untitled"}
          </span>
          <SaveIndicator status={status} />
        </div>
        <DeleteNoteDialog noteId={noteId} noteTitle={title} />
      </header>

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 md:px-6 md:py-10">
        <Input
          value={title}
          onChange={handleTitleChange}
          onBlur={flushSave}
          placeholder="Untitled"
          maxLength={500}
          className="h-auto border-none bg-transparent px-0 text-3xl font-semibold tracking-tight shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 md:text-4xl"
        />

        <div className="flex flex-wrap items-center gap-3">
          <SelectedTags
            tags={tagsAsOptions}
            selectedTagIds={tagIds}
            onRemove={(tagId) =>
              handleTagsChange(tagIds.filter((id) => id !== tagId))
            }
          />
          <TagPicker
            allTags={tagsAsOptions}
            selectedTagIds={tagIds}
            onChange={handleTagsChange}
          />
        </div>

        <Separator />

        <div
          className="bn-container bn-dark min-h-[400px] text-foreground"
          data-color-scheme="dark"
          onBlur={handleEditorBlur}
        >
          {editor ? (
            <BlockNoteView
              editor={editor}
              onChange={handleEditorChange}
              theme="dark"
            />
          ) : (
            <div
              aria-hidden="true"
              className="flex min-h-[400px] items-center justify-center text-sm text-muted-foreground"
            >
              <Loader2 className="size-4 animate-spin" />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status.kind === "idle") return null;
  if (status.kind === "saving") {
    return (
      <span className="ml-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="size-3 animate-spin" />
        Saving…
      </span>
    );
  }
  if (status.kind === "error") {
    return (
      <span className="ml-2 inline-flex items-center gap-1 text-xs text-destructive">
        <ChevronUp className="size-3" />
        {status.message}
      </span>
    );
  }
  return (
    <span className="ml-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Check className="size-3" />
      Saved
    </span>
  );
}