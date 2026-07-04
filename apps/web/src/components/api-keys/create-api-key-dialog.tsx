"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Copy, Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  createApiKeyAction,
  type CreateApiKeyResult,
} from "@/app/actions/api-keys";

type Scope = "read" | "read_write";

type CreatedKey = Extract<CreateApiKeyResult, { ok: true }>;

type CreateApiKeyDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreateApiKeyDialog({
  open,
  onOpenChange,
}: CreateApiKeyDialogProps) {
  const [name, setName] = React.useState("");
  const [scope, setScope] = React.useState<Scope>("read_write");
  const [created, setCreated] = React.useState<CreatedKey | null>(null);
  const [revealed, setRevealed] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const reset = React.useCallback(() => {
    setName("");
    setScope("read_write");
    setCreated(null);
    setRevealed(false);
    setCopied(false);
  }, []);

  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (!next) reset();
      onOpenChange(next);
    },
    [onOpenChange, reset],
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || pending) return;

    startTransition(async () => {
      const result = await createApiKeyAction({
        name: trimmed,
        scope,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setCreated(result);
      toast.success("API key created");
    });
  };

  const handleCopy = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.rawKey);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Failed to copy key");
    }
  };

  if (created) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="size-4" />
              Save your new API key
            </DialogTitle>
            <DialogDescription>
              This is the only time the raw key will be shown. Copy it now and
              store it somewhere safe — you will not be able to see it again.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs">
              <span className="text-muted-foreground">
                {created.apiKey.name} · {scopeLabel(created.apiKey.scope)}
              </span>
              <span className="font-mono text-muted-foreground">
                {created.apiKey.keyPrefix}…
              </span>
            </div>

            <div className="flex items-center gap-2 rounded-md border border-border bg-background p-2">
              <code
                data-testid="raw-api-key"
                className="flex-1 break-all font-mono text-xs"
              >
                {revealed ? created.rawKey : maskKey(created.rawKey)}
              </code>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => setRevealed((value) => !value)}
                aria-label={revealed ? "Hide key" : "Reveal key"}
              >
                {revealed ? <EyeOff /> : <Eye />}
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={handleCopy}
                aria-label="Copy key"
              >
                {copied ? <Check /> : <Copy />}
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => handleOpenChange(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="size-4" />
                Save your new API key
              </DialogTitle>
            <DialogDescription>
              Use API keys to let MCP clients — Claude Desktop, Cursor, and
              similar tools — read and write your notes on your behalf.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="api-key-name">Name</Label>
            <Input
              id="api-key-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Claude Desktop"
              maxLength={100}
              required
              autoFocus
            />
          </div>

          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium">Scope</legend>
            <p className="text-xs text-muted-foreground">
              Read-only keys can list and read notes. Read &amp; write keys can
              also create, update, and delete notes and tags.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <ScopeOption
                value="read"
                label="Read only"
                description="List and read notes"
                selected={scope === "read"}
                onSelect={() => setScope("read")}
                disabled={pending}
              />
              <ScopeOption
                value="read_write"
                label="Read & write"
                description="All actions, including create, update, delete"
                selected={scope === "read_write"}
                onSelect={() => setScope("read_write")}
                disabled={pending}
              />
            </div>
          </fieldset>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !name.trim()}>
              {pending ? (
                <>
                  <Loader2 className="animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  <KeyRound />
                  Create key
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ScopeOption({
  value,
  label,
  description,
  selected,
  onSelect,
  disabled,
}: {
  value: Scope;
  label: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      data-value={value}
      onClick={onSelect}
      disabled={disabled}
      className={
        "flex flex-col items-start gap-1 rounded-md border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 " +
        (selected
          ? "border-primary bg-primary/5"
          : "border-border hover:bg-accent")
      }
    >
      <span className="text-sm font-medium">{label}</span>
      <span className="text-xs text-muted-foreground">{description}</span>
    </button>
  );
}

function maskKey(rawKey: string): string {
  if (rawKey.length <= 8) return rawKey;
  return `${rawKey.slice(0, 3)}${"•".repeat(Math.max(0, rawKey.length - 7))}${rawKey.slice(-4)}`;
}

function scopeLabel(scope: Scope): string {
  return scope === "read_write" ? "Read & write" : "Read only";
}