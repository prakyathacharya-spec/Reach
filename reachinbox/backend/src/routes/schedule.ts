import { Router } from "express";
import multer from "multer";
import Papa from "papaparse";
import { prisma } from "../db/prisma";
import { enqueueEmailJob } from "../queues/emailQueue";
import { env } from "../config/env";

const upload = multer({ storage: multer.memoryStorage() });
export const scheduleRouter = Router();

interface ScheduleBody {
  userId: string; // in a real build this comes from the authenticated session, not the body
  senderId: string;
  subject: string;
  body: string;
  startTime: string; // ISO
  delayMs?: number;
  hourlyLimit?: number;
}

function parseLeadsCsv(buffer: Buffer): string[] {
  const text = buffer.toString("utf-8");
  const parsed = Papa.parse<string[]>(text, { skipEmptyLines: true });
  const emails: string[] = [];
  for (const row of parsed.data) {
    for (const cell of row) {
      const val = String(cell).trim();
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) emails.push(val);
    }
  }
  return [...new Set(emails)];
}

// POST /api/schedule  (multipart/form-data: leadsFile + JSON fields)
scheduleRouter.post("/", upload.single("leadsFile"), async (req, res) => {
  try {
    const body = req.body as ScheduleBody;
    if (!req.file) return res.status(400).json({ error: "leadsFile is required" });

    const recipients = parseLeadsCsv(req.file.buffer);
    if (recipients.length === 0) {
      return res.status(400).json({ error: "No valid email addresses found in file" });
    }

    const delayMs = Number(body.delayMs ?? env.DEFAULT_MIN_DELAY_MS);
    const hourlyLimit = Number(body.hourlyLimit ?? env.DEFAULT_MAX_EMAILS_PER_HOUR);
    const startTime = new Date(body.startTime);

    const campaign = await prisma.campaign.create({
      data: {
        userId: body.userId,
        subject: body.subject,
        body: body.body,
        startTime,
        delayMs,
        hourlyLimit,
      },
    });

    // Create one Email row per recipient, staggered by delayMs, then enqueue
    // each as its own BullMQ delayed job (jobId = email.id => idempotent).
    const created = [];
    for (let i = 0; i < recipients.length; i++) {
      const scheduledAt = new Date(startTime.getTime() + i * delayMs);
      const email = await prisma.email.create({
        data: {
          campaignId: campaign.id,
          senderId: body.senderId,
          recipient: recipients[i],
          subject: body.subject,
          status: "scheduled",
          scheduledAt,
        },
      });
      await enqueueEmailJob(email.id, scheduledAt);
      created.push(email);
    }

    res.status(201).json({
      campaignId: campaign.id,
      recipientCount: created.length,
      firstSendAt: created[0]?.scheduledAt,
      lastSendAt: created[created.length - 1]?.scheduledAt,
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
