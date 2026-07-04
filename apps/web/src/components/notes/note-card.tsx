import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export type NoteCardData = {
  id: string;
  title: string;
  contentText: string;
  updatedAt: Date;
  tags: { id: string; name: string }[];
};

function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + "…";
}

export function NoteCard({ note }: { note: NoteCardData }) {
  return (
    <Link
      href={`/dashboard/notes/${note.id}`}
      className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-xl"
    >
      <Card className="h-full transition-colors group-hover:border-foreground/30">
        <CardContent className="flex h-full flex-col gap-3 p-5">
          <div className="space-y-1">
            <h3 className="line-clamp-2 text-base font-semibold tracking-tight">
              {note.title || "Untitled"}
            </h3>
            {note.contentText ? (
              <p className="line-clamp-3 text-sm text-muted-foreground">
                {truncate(note.contentText, 220)}
              </p>
            ) : (
              <p className="text-sm italic text-muted-foreground">
                No content yet.
              </p>
            )}
          </div>
          <div className="mt-auto flex items-center justify-between gap-2 pt-1 text-xs text-muted-foreground">
            <div className="flex flex-wrap items-center gap-1">
              {note.tags.length === 0 ? (
                <span className="italic">No tags</span>
              ) : (
                note.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag.id} variant="secondary" className="rounded-full">
                    {tag.name}
                  </Badge>
                ))
              )}
              {note.tags.length > 3 ? (
                <span className="text-xs text-muted-foreground">
                  +{note.tags.length - 3}
                </span>
              ) : null}
            </div>
            <span className="shrink-0">{formatRelativeDate(note.updatedAt)}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
