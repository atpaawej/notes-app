import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { SettingsTabs, type ApiKeyRow } from "@/components/settings/settings-tabs";
import { db, services } from "@notes/db";
import { requireUser } from "@/lib/auth/require-user";

export const metadata = {
  title: "Settings — Notes",
};

export default async function SettingsPage() {
  const user = await requireUser();

  const apiKeyRows = await services.listApiKeys(db, user.id);

  const serialisedKeys: ApiKeyRow[] = apiKeyRows.map((key) => ({
    id: key.id,
    name: key.name,
    keyPrefix: key.keyPrefix,
    scope: key.scope as "read" | "read_write",
    lastUsedAt: key.lastUsedAt ? key.lastUsedAt.toISOString() : null,
    createdAt: key.createdAt.toISOString(),
  }));

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
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 md:p-6">
        <SettingsTabs
          email={user.email}
          displayName={user.displayName}
          avatarUrl={user.avatarUrl}
          apiKeys={serialisedKeys}
        />
      </div>
    </>
  );
}