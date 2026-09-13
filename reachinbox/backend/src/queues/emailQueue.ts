import { Queue } from "bullmq";
import IORedis from "ioredis";
import { env } from "../config/env";

// maxRetriesPerRequest: null is required by BullMQ for its blocking connections
export const redisConnection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const EMAIL_QUEUE_NAME = "email-send";

export const emailQueue = new Queue(EMAIL_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    // We handle "failure" ourselves (reschedule into next hour window) rather than
    // letting BullMQ's own retry/backoff fight with our rate-limit logic.
    attempts: 5,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: 1000,
    removeOnFail: 5000,
  },
});

export interface EmailJobData {
  emailId: string;
}

/**
 * Enqueue (or re-enqueue) a single email as a BullMQ delayed job.
 * jobId = emailId is the idempotency guard: BullMQ will not create a second
 * job with the same id, so re-running a schedule request or a crash-recovery
 * reconciliation pass can never produce a duplicate send.
 */
export async function enqueueEmailJob(emailId: string, sendAt: Date) {
  const delay = Math.max(0, sendAt.getTime() - Date.now());
  await emailQueue.add(
    "send-email",
    { emailId } satisfies EmailJobData,
    {
      jobId: emailId,
      delay,
    }
  );
}
