import {
  TagsManager,
  TagsPageHeader,
  type TagRow,
} from "@/components/tags/tags-manager";
import { db, services } from "@notes/db";
import { requireUser } from "@/lib/auth/require-user";

export const dynamic = "force-dynamic";

export default async function TagsPage() {
  const user = await requireUser();

  const tags = await services.listTagsWithCounts(db, user.id);

  const rows: TagRow[] = tags.map((tag) => ({
    id: tag.id,
    name: tag.name,
    noteCount: tag.noteCount,
    createdAt: tag.createdAt.toISOString(),
  }));

  return (
    <>
      <TagsPageHeader />
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <p className="text-sm text-muted-foreground">
          Tags you create can be added to any note from the editor. Click a tag
          in the sidebar to filter your notes list.
        </p>
        <TagsManager tags={rows} />
      </div>
    </>
  );
}
