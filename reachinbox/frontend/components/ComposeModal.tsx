"use client";

import { useState } from "react";
import Papa from "papaparse";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { submitSchedule } from "@/lib/api";
import { ScheduleFormValues } from "@/lib/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ComposeModal({
  open,
  onClose,
  userId,
  senderId,
  onScheduled,
}: {
  open: boolean;
  onClose: () => void;
  userId: string;
  senderId: string;
  onScheduled: () => void;
}) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [startTime, setStartTime] = useState("");
  const [delayMs, setDelayMs] = useState(2000);
  const [hourlyLimit, setHourlyLimit] = useState(200);
  const [leadsFile, setLeadsFile] = useState<File | null>(null);
  const [leadCount, setLeadCount] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFile(file: File | null) {
    setLeadsFile(file);
    setLeadCount(null);
    if (!file) return;
    Papa.parse<string[]>(file, {
      skipEmptyLines: true,
      complete: (results) => {
        const found = new Set<string>();
        for (const row of results.data) {
          for (const cell of row) {
            const val = String(cell).trim();
            if (EMAIL_RE.test(val)) found.add(val);
          }
        }
        setLeadCount(found.size);
      },
    });
  }

  async function handleSubmit() {
    setError(null);
    if (!leadsFile || !subject || !body || !startTime) {
      setError("Subject, body, start time, and a leads file are all required.");
      return;
    }
    const values: ScheduleFormValues = { senderId, subject, body, startTime, delayMs, hourlyLimit, leadsFile };
    setSubmitting(true);
    try {
      await submitSchedule(userId, values);
      onScheduled();
      onClose();
    } catch (e: any) {
      setError(e.message ?? "Something went wrong scheduling this send.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Compose new email">
      <div className="space-y-4">
        <div>
          <label className="block text-xs text-ink/60 mb-1">Subject</label>
          <input
            className="w-full border border-line bg-transparent px-3 py-2 text-sm focus:outline-none focus:border-signal"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs text-ink/60 mb-1">Body</label>
          <textarea
            className="w-full border border-line bg-transparent px-3 py-2 text-sm h-28 focus:outline-none focus:border-signal"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs text-ink/60 mb-1">Leads (CSV or text file)</label>
          <input
            type="file"
            accept=".csv,.txt"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm"
          />
          {leadCount !== null && (
            <p className="mt-1 text-xs text-ink/60">{leadCount} email address{leadCount === 1 ? "" : "es"} detected</p>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-ink/60 mb-1">Start time</label>
            <input
              type="datetime-local"
              className="w-full border border-line bg-transparent px-2 py-2 text-sm focus:outline-none focus:border-signal"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-ink/60 mb-1">Delay (ms)</label>
            <input
              type="number"
              className="w-full border border-line bg-transparent px-2 py-2 text-sm focus:outline-none focus:border-signal"
              value={delayMs}
              onChange={(e) => setDelayMs(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-xs text-ink/60 mb-1">Hourly limit</label>
            <input
              type="number"
              className="w-full border border-line bg-transparent px-2 py-2 text-sm focus:outline-none focus:border-signal"
              value={hourlyLimit}
              onChange={(e) => setHourlyLimit(Number(e.target.value))}
            />
          </div>
        </div>

        {error && <p className="text-xs text-rose">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Scheduling…" : "Schedule"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
