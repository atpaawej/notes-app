"use client";

import { KeyRound, User as UserIcon } from "lucide-react";

import { ApiKeysTab, type ApiKeyRow } from "@/components/api-keys/api-keys-tab";
import { ProfileTab } from "@/components/settings/profile-tab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type { ApiKeyRow };

type SettingsTabsProps = {
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  apiKeys: ApiKeyRow[];
};

export function SettingsTabs({
  email,
  displayName,
  avatarUrl,
  apiKeys,
}: SettingsTabsProps) {
  return (
    <Tabs defaultValue="profile" className="w-full">
      <TabsList>
        <TabsTrigger value="profile">
          <UserIcon />
          Profile
        </TabsTrigger>
        <TabsTrigger value="api-keys">
          <KeyRound />
          API keys
          <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {apiKeys.length}
          </span>
        </TabsTrigger>
      </TabsList>
      <TabsContent value="profile">
        <ProfileTab
          email={email}
          displayName={displayName}
          avatarUrl={avatarUrl}
        />
      </TabsContent>
      <TabsContent value="api-keys">
        <ApiKeysTab apiKeys={apiKeys} />
      </TabsContent>
    </Tabs>
  );
}