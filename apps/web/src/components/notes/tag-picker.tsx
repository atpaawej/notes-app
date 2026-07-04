"use client";

import { Check, Loader2, Plus, X } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { createTagAction } from "@/app/actions/tags";
import { cn } from "@/lib/utils";

export type TagOption = { id: string; name: string };

type TagPickerProps = {
  allTags: TagOption[];
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
};

export function TagPicker({ allTags, selectedTagIds, onChange }: TagPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [newTagName, setNewTagName] = React.useState("");
  const [creating, startCreating] = React.useTransition();

  const toggleTag = (id: string) => {
    if (selectedTagIds.includes(id)) {
      onChange(selectedTagIds.filter((existing) => existing !== id));
    } else {
      onChange([...selectedTagIds, id]);
    }
  };

  const handleCreateTag = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = newTagName.trim();
    if (!name || creating) return;

    startCreating(async () => {
      const result = await createTagAction({ name });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      onChange([...selectedTagIds, result.id]);
      setNewTagName("");
      toast.success(`Tag “${result.name}” created`);
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1"
          aria-label="Manage tags"
        >
          <Plus />
          Add tag
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="flex w-72 flex-col gap-3 p-3"
      >
        <div className="flex flex-col gap-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Choose tag
          </Label>
          {allTags.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No tags yet. Create one below.
            </p>
          ) : (
            <div className="max-h-56 overflow-y-auto">
              <ul className="flex flex-col">
                {allTags.map((tag) => {
                  const isSelected = selectedTagIds.includes(tag.id);
                  return (
                    <li key={tag.id}>
                      <button
                        type="button"
                        onClick={() => toggleTag(tag.id)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent",
                          isSelected && "bg-accent/50",
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-4 shrink-0 items-center justify-center rounded border border-border",
                            isSelected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "bg-background",
                          )}
                        >
                          {isSelected ? <Check className="size-3" /> : null}
                        </span>
                        <span className="truncate">{tag.name}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        <div className="border-t border-border pt-3">
          <Label
            htmlFor="new-tag-name"
            className="text-xs uppercase tracking-wider text-muted-foreground"
          >
            New tag
          </Label>
          <form
            onSubmit={handleCreateTag}
            className="mt-1.5 flex items-center gap-2"
          >
            <Input
              id="new-tag-name"
              value={newTagName}
              onChange={(event) => setNewTagName(event.target.value)}
              placeholder="tag-name"
              maxLength={50}
              disabled={creating}
            />
            <Button
              type="submit"
              size="sm"
              disabled={creating || !newTagName.trim()}
            >
              {creating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
            </Button>
          </form>
        </div>
      </PopoverContent>
    </Popover>
  );
}

type SelectedTagsProps = {
  tags: TagOption[];
  selectedTagIds: string[];
  onRemove: (tagId: string) => void;
};

export function SelectedTags({
  tags,
  selectedTagIds,
  onRemove,
}: SelectedTagsProps) {
  const visible = tags.filter((tag) => selectedTagIds.includes(tag.id));

  if (visible.length === 0) {
    return (
      <p className="text-xs italic text-muted-foreground">No tags assigned</p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">
        Tags
      </span>
      {visible.map((tag) => (
        <Badge key={tag.id} variant="secondary" className="gap-1 rounded-full">
          {tag.name}
          <button
            type="button"
            onClick={() => onRemove(tag.id)}
            className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label={`Remove tag ${tag.name}`}
          >
            <X className="size-3" />
          </button>
        </Badge>
      ))}
    </div>
  );
}
