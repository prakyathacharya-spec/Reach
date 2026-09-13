export type EmailStatus = "pending" | "scheduled" | "sent" | "failed";

export interface EmailRow {
  id: string;
  recipient: string;
  subject: string;
  status: EmailStatus;
  scheduledAt: string;
  sentAt: string | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export interface ScheduleFormValues {
  senderId: string;
  subject: string;
  body: string;
  startTime: string;
  delayMs: number;
  hourlyLimit: number;
  leadsFile: File | null;
}
