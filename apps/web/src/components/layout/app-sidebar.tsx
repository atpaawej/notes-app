import { FileText, Hash, Plus, Settings } from "lucide-react";
import Link from "next/link";

import { CreateTagDialog } from "@/components/tags/create-tag-dialog";
import { UserNav } from "@/components/layout/user-nav";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { db, services } from "@notes/db";

import type { SessionUser } from "@/lib/auth/session";

export async function AppSidebar({ user }: { user: SessionUser }) {
  const tags = await services.listTags(db, user.id);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <FileText className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Notes</span>
                  <span className="truncate text-xs text-muted-foreground">
                    Your notebook
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Library</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="All Notes">
                  <Link href="/dashboard">
                    <FileText />
                    <span>All Notes</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>
            <Hash className="mr-1 size-3.5" />
            Tags
          </SidebarGroupLabel>
          <SidebarGroupAction asChild>
            <CreateTagDialog>
              <button
                type="button"
                aria-label="Create tag"
                className="flex size-5 items-center justify-center rounded-md text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <Plus className="size-3.5" />
              </button>
            </CreateTagDialog>
          </SidebarGroupAction>
          <SidebarGroupContent>
            {tags.length === 0 ? (
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="No tags yet"
                    className="text-muted-foreground"
                  >
                    <Link href="/dashboard/tags">
                      <Badge
                        variant="outline"
                        className="h-5 rounded-full px-2 text-[10px] font-normal"
                      >
                        empty
                      </Badge>
                      <span className="italic">No tags yet</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            ) : (
              <SidebarMenu>
                {tags.map((tag) => (
                  <SidebarMenuItem key={tag.id}>
                    <SidebarMenuButton
                      asChild
                      tooltip={tag.name}
                      className="group/tag"
                    >
                      <Link href={`/dashboard?tag=${tag.id}`}>
                        <Hash className="size-3.5 text-muted-foreground" />
                        <span className="truncate">{tag.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Settings">
              <Link href="/dashboard/settings">
                <Settings />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <UserNav
          displayName={user.displayName}
          email={user.email}
          avatarUrl={user.avatarUrl}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
