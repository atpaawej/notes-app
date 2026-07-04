import { FileText, Plus } from "lucide-react";

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
import { getCurrentUser } from "@/lib/auth/session";

export default async function NotesListPage() {
  const user = await getCurrentUser();

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
            {user?.displayName ? (
              <p className="text-xs text-muted-foreground">
                Welcome back, {user.displayName.split(" ")[0]}
              </p>
            ) : null}
          </div>
          <Button size="sm" disabled aria-label="Create note (coming soon)">
            <Plus />
            New note
          </Button>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileText />
            </EmptyMedia>
            <EmptyTitle>No notes yet</EmptyTitle>
            <EmptyDescription>
              Notes you create will show up here. Get started by writing your
              first one.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button disabled>
              <Plus />
              Create your first note
            </Button>
            <p className="text-xs text-muted-foreground">
              Note creation ships in the next release.
            </p>
          </EmptyContent>
        </Empty>
      </div>
    </>
  );
}