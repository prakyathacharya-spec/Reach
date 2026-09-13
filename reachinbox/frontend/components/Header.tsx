"use client";

import { User } from "@/lib/types";
import { slackConnectUrl } from "@/lib/api";
import { Button } from "./Button";

export function Header({ user, onLogout }: { user: User; onLogout: () => void }) {
  return (
    <header className="flex items-center justify-between border-b border-line px-8 py-5">
      <div className="flex items-baseline gap-3">
        <span className="font-display text-xl">ReachInbox</span>
        <span className="text-xs text-ink/50">Scheduler</span>
      </div>
      <div className="flex items-center gap-4">
        <a href={slackConnectUrl()} className="text-sm text-ink/70 hover:text-ink underline underline-offset-2">
          Connect Slack
        </a>
        <div className="flex items-center gap-2">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.name} className="h-8 w-8 rounded-full" />
          ) : (
            <div className="h-8 w-8 rounded-full bg-signal/20 flex items-center justify-center text-sm">
              {user.name.charAt(0)}
            </div>
          )}
          <div className="text-sm leading-tight">
            <div className="font-medium">{user.name}</div>
            <div className="text-ink/50">{user.email}</div>
          </div>
        </div>
        <Button variant="ghost" onClick={onLogout}>
          Log out
        </Button>
      </div>
    </header>
  );
}
