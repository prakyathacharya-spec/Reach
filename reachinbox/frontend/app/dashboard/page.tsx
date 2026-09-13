"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { EmailTable } from "@/components/EmailTable";
import { ComposeModal } from "@/components/ComposeModal";
import { Button } from "@/components/Button";
import { fetchMe, fetchSenders, fetchScheduledEmails, fetchSentEmails, logout } from "@/lib/api";
import { EmailRow, User } from "@/lib/types";

type Tab = "scheduled" | "sent";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [senderId, setSenderId] = useState<string>("");
  const [tab, setTab] = useState<Tab>("scheduled");
  const [rows, setRows] = useState<EmailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);

  const loadRows = useCallback(async (activeTab: Tab) => {
    setLoading(true);
    try {
      const data = activeTab === "scheduled" ? await fetchScheduledEmails() : await fetchSentEmails();
      setRows(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const me = await fetchMe();
      if (!me) {
        router.push("/login");
        return;
      }
      setUser(me);
      const senders = await fetchSenders();
      if (senders[0]) setSenderId(senders[0].id);
    })();
  }, [router]);

  useEffect(() => {
    loadRows(tab);
  }, [tab, loadRows]);

  if (!user) {
    return <main className="flex min-h-screen items-center justify-center text-sm text-ink/50">Loading…</main>;
  }

  return (
    <main className="min-h-screen">
      <Header
        user={user}
        onLogout={async () => {
          await logout();
          router.push("/login");
        }}
      />

      <div className="mx-auto max-w-4xl px-8 py-10">
        <div className="flex items-center justify-between mb-8">
          <div className="flex gap-6 text-sm">
            {(["scheduled", "sent"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`pb-2 border-b-2 capitalize ${
                  tab === t ? "border-signal text-ink" : "border-transparent text-ink/50 hover:text-ink"
                }`}
              >
                {t} emails
              </button>
            ))}
          </div>
          <Button onClick={() => setComposeOpen(true)}>Compose new email</Button>
        </div>

        <EmailTable rows={rows} loading={loading} mode={tab} />
      </div>

      <ComposeModal
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        userId={user.id}
        senderId={senderId}
        onScheduled={() => loadRows("scheduled")}
      />
    </main>
  );
}
