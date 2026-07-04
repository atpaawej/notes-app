import { Mail, User as UserIcon } from "lucide-react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";

type ProfileTabProps = {
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
};

export function ProfileTab({
  email,
  displayName,
  avatarUrl,
}: ProfileTabProps) {
  const initials = displayName
    ? displayName
        .split(" ")
        .map((part) => part[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : email.slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col gap-6">
      <header className="space-y-1">
        <h2 className="text-base font-semibold tracking-tight">Profile</h2>
        <p className="text-sm text-muted-foreground">
          Your account is tied to your Google identity. Display name and avatar
          come from Google and are read-only here.
        </p>
      </header>

      <Card>
        <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
          <Avatar className="size-16 rounded-xl">
            {avatarUrl ? (
              <AvatarImage src={avatarUrl} alt={displayName ?? email} />
            ) : null}
            <AvatarFallback className="rounded-xl text-base">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex flex-1 flex-col gap-3">
            <Field
              icon={<UserIcon className="size-4" />}
              label="Display name"
              value={displayName ?? "Not set"}
              muted={!displayName}
            />
            <Field
              icon={<Mail className="size-4" />}
              label="Email"
              value={email}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  icon,
  label,
  value,
  muted,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="flex flex-col">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span
          className={
            muted
              ? "text-sm italic text-muted-foreground"
              : "text-sm font-medium"
          }
        >
          {value}
        </span>
      </div>
    </div>
  );
}