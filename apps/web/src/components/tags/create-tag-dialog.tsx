"use client";

import { Hash, Loader2, Plus } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createTagAction } from "@/app/actions/tags";
import { useRouter } from "next/navigation";

type CreateTagDialogProps = {
  children?: React.ReactNode;
};

export function CreateTagDialog({ children }: CreateTagDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [pending, startTransition] = React.useTransition();
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleOpenChange = React.useCallback((next: boolean) => {
    setOpen(next);
    if (!next) setName("");
  }, []);

  React.useEffect(() => {
    if (open) {
      const id = window.setTimeout(() => inputRef.current?.focus(), 50);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [open]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim() || pending) return;

    startTransition(async () => {
      const result = await createTagAction({ name: name.trim() });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Tag “${result.name}” created`);
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children ?? (
          <Button variant="outline" size="sm">
            <Plus />
            New tag
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Hash className="size-4" />
              New tag
            </DialogTitle>
            <DialogDescription>
              Tags are flat labels. Use them to group notes however you like.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="new-tag-name-input">Name</Label>
            <Input
              id="new-tag-name-input"
              ref={inputRef}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. ideas"
              maxLength={50}
              required
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !name.trim()}>
              {pending ? (
                <>
                  <Loader2 className="animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  <Plus />
                  Create tag
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
