"use client";

import { Hash, Loader2, Trash2 } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { CreateTagDialog } from "@/components/tags/create-tag-dialog";
import { deleteTagAction } from "@/app/actions/tags";
import { useRouter } from "next/navigation";

export type TagRow = {
  id: string;
  name: string;
  noteCount: number;
  createdAt: string;
};

type Props = {
  tags: TagRow[];
};

export function TagsManager({ tags }: Props) {
  if (tags.length === 0) {
    return <TagsEmptyState />;
  }

  return (
    <div className="rounded-xl border border-border">
      <ul className="divide-y divide-border">
        {tags.map((tag) => (
          <li
            key={tag.id}
            className="flex items-center justify-between gap-3 px-4 py-3"
          >
            <div className="flex min-w-0 items-center gap-3">
              <Badge variant="secondary" className="rounded-full">
                <Hash className="mr-1 size-3" />
                {tag.name}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {tag.noteCount} {tag.noteCount === 1 ? "note" : "notes"}
              </span>
            </div>
            <DeleteTagButton id={tag.id} name={tag.name} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function TagsEmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border p-12 text-center">
      <span className="flex size-10 items-center justify-center rounded-lg bg-muted text-foreground">
        <Hash className="size-6" />
      </span>
      <div className="space-y-1">
        <p className="font-medium tracking-tight">No tags yet</p>
        <p className="text-sm text-muted-foreground">
          Create your first tag to start organising your notes.
        </p>
      </div>
      <CreateTagDialog>
        <Button>
          <Hash className="size-4" />
          Create your first tag
        </Button>
      </CreateTagDialog>
    </div>
  );
}

function DeleteTagButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const handleDelete = () => {
    if (pending) return;
    startTransition(async () => {
      const result = await deleteTagAction(id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Tag “${name}” deleted`);
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Delete tag ${name}`}
        >
          <Trash2 />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete tag?</AlertDialogTitle>
          <AlertDialogDescription>
            &ldquo;{name}&rdquo; will be removed from every note it is on. This
            cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault();
              handleDelete();
            }}
            disabled={pending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {pending ? (
              <>
                <Loader2 className="animate-spin" />
                Deleting…
              </>
            ) : (
              <>
                <Trash2 />
                Delete tag
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function TagsPageHeader() {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator
        orientation="vertical"
        className="mr-2 data-[orientation=vertical]:h-4"
      />
      <div className="flex flex-1 items-center justify-between gap-2">
        <h1 className="text-base font-semibold tracking-tight">Tags</h1>
        <CreateTagDialog>
          <Button size="sm">
            <Hash className="size-4" />
            New tag
          </Button>
        </CreateTagDialog>
      </div>
    </header>
  );
}
