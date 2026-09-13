import { Worker, Job } from "bullmq";
import { redisConnection, EMAIL_QUEUE_NAME, EmailJobData, enqueueEmailJob } from "../queues/emailQueue";
import { tryReserveSendSlot, startOfNextHour } from "../lib/rateLimiter";
import { prisma } from "../db/prisma";
import { sendMail } from "../mailer/ethereal";
import { notifyRateLimitHit } from "../lib/slack";
import { indexEmail } from "../lib/searchIndex";
import { env } from "../config/env";

async function processEmailJob(job: Job<EmailJobData>) {
  const { emailId } = job.data;

  const email = await prisma.email.findUnique({
    where: { id: emailId },
    include: { sender: true, campaign: true },
  });
  if (!email) return; // deleted underneath us — nothing to do

  // Idempotency guard #2: even if this job somehow ran twice (e.g. a crashed
  // worker whose lock expired mid-send), never send the same email twice.
  if (email.status === "sent") return;

  const allowed = await tryReserveSendSlot(email.senderId, email.campaign.hourlyLimit);

  if (!allowed) {
    // Do NOT fail the job. Push it into the next hour window and re-enqueue
    // under the same jobId isn't possible (BullMQ won't let us reuse a jobId
    // for a job still active), so we mark this attempt done and create the
    // successor job pointing at the same email row.
    const nextSlot = startOfNextHour(new Date());
    await prisma.email.update({
      where: { id: email.id },
      data: { status: "scheduled", scheduledAt: nextSlot },
    });
    await enqueueEmailJob(email.id, nextSlot);
    await notifyRateLimitHit(email.campaign.userId, email.sender.name, email.campaign.hourlyLimit);
    return;
  }

  try {
    const result = await sendMail({
      etherealUser: email.sender.etherealUser,
      etherealPass: email.sender.etherealPass,
      to: email.recipient,
      subject: email.subject,
      html: email.campaign.body,
    });

    const updated = await prisma.email.update({
      where: { id: email.id },
      data: {
        status: "sent",
        sentAt: new Date(),
        attemptCount: { increment: 1 },
        lastError: result.previewUrl ?? null,
      },
    });
    await indexEmail(updated);
  } catch (err: any) {
    await prisma.email.update({
      where: { id: email.id },
      data: { attemptCount: { increment: 1 }, lastError: String(err?.message ?? err) },
    });
    throw err; // let BullMQ's attempts/backoff handle transient SMTP errors
  }
}

export const emailWorker = new Worker<EmailJobData>(EMAIL_QUEUE_NAME, processEmailJob, {
  connection: redisConnection,
  concurrency: env.WORKER_CONCURRENCY,
  // Minimum delay between sends (provider-throttling simulation), independent of
  // the hourly cap above. See README: "min delay between individual sends".
  limiter: {
    max: 1,
    duration: env.DEFAULT_MIN_DELAY_MS,
  },
});

emailWorker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});

/**
 * Crash-recovery reconciliation: on worker boot, find any email rows that are
 * pending/scheduled in the DB but have no corresponding live BullMQ job
 * (this only happens if Redis itself was wiped/lost — normal restarts don't
 * need this since Redis persists delayed jobs on its own). This is what
 * guarantees "future emails still send at the right time" even in the worst case.
 */
async function reconcileOnBoot() {
  const pending = await prisma.email.findMany({
    where: { status: { in: ["pending", "scheduled"] } },
  });

  for (const email of pending) {
    const existingJob = await job_exists(email.id);
    if (!existingJob) {
      await enqueueEmailJob(email.id, email.scheduledAt);
    }
  }
  console.log(`Reconciled ${pending.length} pending emails on boot.`);
}

async function job_exists(jobId: string): Promise<boolean> {
  const { emailQueue } = await import("../queues/emailQueue");
  const job = await emailQueue.getJob(jobId);
  return !!job;
}

reconcileOnBoot().catch((e) => console.error("Reconciliation failed:", e));

console.log(`Email worker started with concurrency=${env.WORKER_CONCURRENCY}`);
