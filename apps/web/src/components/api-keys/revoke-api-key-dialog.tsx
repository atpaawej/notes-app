"use client";

import { Loader2, Trash2 } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteApiKeyAction } from "@/app/actions/api-keys";
import { useRouter } from "next/navigation";

type RevokeApiKeyDialogProps = {
  apiKeyId: string;
  apiKeyName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function RevokeApiKeyDialog({
  apiKeyId,
  apiKeyName,
  open,
  onOpenChange,
}: RevokeApiKeyDialogProps) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  const handleRevoke = () => {
    if (pending) return;
    startTransition(async () => {
      const result = await deleteApiKeyAction({ apiKeyId });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`API key “${apiKeyName}” revoked`);
      onOpenChange(false);
      router.refresh();
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Revoke this API key?</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="block">
              &ldquo;{apiKeyName}&rdquo; will be deleted permanently. Any MCP
              client using it will lose access immediately. This cannot be
              undone.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault();
              handleRevoke();
            }}
            disabled={pending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {pending ? (
              <>
                <Loader2 className="animate-spin" />
                Revoking…
              </>
            ) : (
              <>
                <Trash2 />
                Revoke key
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}