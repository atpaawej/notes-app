"use client";

import { KeyRound, Plus, ShieldCheck, Trash2 } from "lucide-react";
import * as React from "react";

import { RevokeApiKeyDialog } from "@/components/api-keys/revoke-api-key-dialog";
import { Badge } from "@/components/ui/badge";
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

import { CreateApiKeyDialog } from "@/components/api-keys/create-api-key-dialog";

export type ApiKeyRow = {
  id: string;
  name: string;
  keyPrefix: string;
  scope: "read" | "read_write";
  lastUsedAt: string | null;
  createdAt: string;
};

type ApiKeysTabProps = {
  apiKeys: ApiKeyRow[];
};

export function ApiKeysTab({ apiKeys }: ApiKeysTabProps) {
  const [createOpen, setCreateOpen] = React.useState(false);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-base font-semibold tracking-tight">API keys</h2>
          <p className="text-sm text-muted-foreground">
            Generate keys to give MCP clients — Claude Desktop, Cursor, and
            similar tools — access to your notes. Each key shows its prefix and
            scope so you can recognise it at a glance.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="shrink-0">
          <Plus />
          New API key
        </Button>
      </header>

      {apiKeys.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <KeyRound />
            </EmptyMedia>
            <EmptyTitle>No API keys yet</EmptyTitle>
            <EmptyDescription>
              Create one to connect an MCP client to your notes. The raw key is
              shown exactly once — store it somewhere safe.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus />
              Create your first API key
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <ApiKeyList apiKeys={apiKeys} />
      )}

      <Separator />

      <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" />
        <p>
          We never store the raw key. Only a bcrypt hash and the first eight
          characters (the prefix) are saved. If you lose a key, revoke it and
          create a new one.
        </p>
      </div>

      <CreateApiKeyDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function ApiKeyList({ apiKeys }: { apiKeys: ApiKeyRow[] }) {
  return (
    <ul className="divide-y divide-border rounded-xl border border-border">
      {apiKeys.map((apiKey) => (
        <li
          key={apiKey.id}
          className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate text-sm font-medium">{apiKey.name}</span>
              <ScopeBadge scope={apiKey.scope} />
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                {apiKey.keyPrefix}…
              </code>
            </div>
            <p className="text-xs text-muted-foreground">
              <span>Created {formatRelative(apiKey.createdAt)}</span>
              <span className="mx-1.5">·</span>
              <span>
                {apiKey.lastUsedAt
                  ? `Last used ${formatRelative(apiKey.lastUsedAt)}`
                  : "Never used"}
              </span>
            </p>
          </div>
          <RevokeApiKeyTrigger apiKey={apiKey} />
        </li>
      ))}
    </ul>
  );
}

function ScopeBadge({ scope }: { scope: "read" | "read_write" }) {
  const isReadWrite = scope === "read_write";
  return (
    <Badge
      variant={isReadWrite ? "default" : "secondary"}
      className="rounded-full text-[10px] font-medium uppercase tracking-wide"
    >
      {isReadWrite ? "Read & write" : "Read only"}
    </Badge>
  );
}

function RevokeApiKeyTrigger({ apiKey }: { apiKey: ApiKeyRow }) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="shrink-0"
        onClick={() => setOpen(true)}
      >
        <Trash2 />
        Revoke
      </Button>
      <RevokeApiKeyDialog
        apiKeyId={apiKey.id}
        apiKeyName={apiKey.name}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}

function formatRelative(iso: string): string {
  const then = new Date(iso);
  const now = Date.now();
  const diffMs = now - then.getTime();
  const diffSec = Math.round(diffMs / 1000);

  if (Number.isNaN(diffSec)) return "—";
  if (diffSec < 30) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;

  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;

  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;

  return then.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}