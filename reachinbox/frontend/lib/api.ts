import { EmailRow, ScheduleFormValues, User } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function fetchScheduledEmails(): Promise<EmailRow[]> {
  const res = await fetch(`${API_BASE}/api/emails/scheduled`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load scheduled emails");
  return res.json();
}

export async function fetchSentEmails(): Promise<EmailRow[]> {
  const res = await fetch(`${API_BASE}/api/emails/sent`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load sent emails");
  return res.json();
}

export async function submitSchedule(userId: string, values: ScheduleFormValues) {
  const formData = new FormData();
  formData.append("userId", userId);
  formData.append("senderId", values.senderId);
  formData.append("subject", values.subject);
  formData.append("body", values.body);
  formData.append("startTime", values.startTime);
  formData.append("delayMs", String(values.delayMs));
  formData.append("hourlyLimit", String(values.hourlyLimit));
  if (values.leadsFile) formData.append("leadsFile", values.leadsFile);

  const res = await fetch(`${API_BASE}/api/schedule`, {
    method: "POST",
    body: formData,
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Schedule request failed" }));
    throw new Error(err.error ?? "Schedule request failed");
  }
  return res.json();
}

export async function fetchMe(): Promise<User | null> {
  const res = await fetch(`${API_BASE}/api/me`, { credentials: "include" });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error("Failed to load current user");
  return res.json();
}

export async function fetchSenders(): Promise<{ id: string; name: string }[]> {
  const res = await fetch(`${API_BASE}/api/me/senders`, { credentials: "include" });
  if (!res.ok) return [];
  return res.json();
}

export async function logout() {
  await fetch(`${API_BASE}/auth/google/logout`, { method: "POST", credentials: "include" });
}

export function googleLoginUrl() {
  return `${API_BASE}/auth/google`;
}

export function slackConnectUrl() {
  return `${API_BASE}/auth/slack/start`;
}
