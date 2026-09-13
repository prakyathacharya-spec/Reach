import { EmailRow, EmailStatus } from "@/lib/types";

const statusStyles: Record<EmailStatus, string> = {
  pending: "text-ink/60 border-line",
  scheduled: "text-amber border-amber/40",
  sent: "text-moss border-moss/40",
  failed: "text-rose border-rose/40",
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function EmailTable({
  rows,
  loading,
  mode,
}: {
  rows: EmailRow[];
  loading: boolean;
  mode: "scheduled" | "sent";
}) {
  if (loading) {
    return (
      <div className="py-16 text-center text-sm text-ink/50">Loading {mode} emails…</div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-ink/60">
          {mode === "scheduled"
            ? "Nothing scheduled yet. Compose a new email to get started."
            : "No emails sent yet."}
        </p>
      </div>
    );
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-line text-left text-ink/50">
          <th className="py-2 font-normal">Recipient</th>
          <th className="py-2 font-normal">Subject</th>
          <th className="py-2 font-normal">{mode === "scheduled" ? "Scheduled for" : "Sent at"}</th>
          <th className="py-2 font-normal">Status</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} className="border-b border-line/60">
            <td className="py-3 pr-4">{row.recipient}</td>
            <td className="py-3 pr-4 text-ink/80">{row.subject}</td>
            <td className="py-3 pr-4 text-ink/70">
              {formatDate(mode === "scheduled" ? row.scheduledAt : row.sentAt)}
            </td>
            <td className="py-3">
              <span className={`inline-block border px-2 py-0.5 text-xs ${statusStyles[row.status]}`}>
                {row.status}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
