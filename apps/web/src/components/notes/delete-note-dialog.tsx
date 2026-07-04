"use client";

import { Loader2, Trash2 } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { deleteNoteAction } from "@/app/actions/notes";
import { useRouter } from "next/navigation";

type DeleteNoteDialogProps = {
  noteId: string;
  noteTitle: string;
  trigger?: React.ReactNode;
};

export function DeleteNoteDialog({
  noteId,
  noteTitle,
  trigger,
}: DeleteNoteDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const handleDelete = () => {
    if (pending) return;
    startTransition(async () => {
      const result = await deleteNoteAction(noteId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Note deleted");
      setOpen(false);
      router.push("/dashboard");
      router.refresh();
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <Trash2 />
            Delete
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this note?</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="block">
              &ldquo;{noteTitle || "Untitled"}&rdquo; will be deleted
              permanently. This cannot be undone.
            </span>
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
                Delete note
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
