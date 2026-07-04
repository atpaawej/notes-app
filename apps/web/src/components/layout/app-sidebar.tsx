import { FileText, Hash, Settings } from "lucide-react";
import Link from "next/link";

import { UserNav } from "@/components/layout/user-nav";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

import type { SessionUser } from "@/lib/auth/session";

export function AppSidebar({ user }: { user: SessionUser }) {
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
                <SidebarMenuButton asChild tooltip="All Notes" isActive>
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
          <SidebarGroupLabel>Coming soon</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <PlaceholderNavItem icon={<Hash />} label="Tags" />
              </SidebarMenuItem>
              <SidebarMenuItem>
                <PlaceholderNavItem icon={<Settings />} label="Settings" />
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
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

function PlaceholderNavItem({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <SidebarMenuButton
      disabled
      tooltip={label}
      className="cursor-not-allowed text-muted-foreground opacity-60"
    >
      {icon}
      <span>{label}</span>
    </SidebarMenuButton>
  );
}