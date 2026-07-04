import { Construction } from "lucide-react";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

export default function SettingsPage() {
  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-semibold tracking-tight">Settings</h1>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Construction />
            </EmptyMedia>
            <EmptyTitle>Settings is coming soon</EmptyTitle>
            <EmptyDescription>
              Profile, API keys, and appearance controls will live here.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    </>
  );
}