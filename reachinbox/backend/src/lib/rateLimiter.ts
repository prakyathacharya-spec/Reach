import { redisConnection } from "../queues/emailQueue";

/**
 * Fixed-hour-window counter, keyed by sender, backed by Redis INCR+EXPIRE.
 * Safe across multiple worker processes/instances because INCR is atomic in Redis —
 * two workers racing to send at the same instant still get a correct shared count.
 *
 * Window key = senderId + the current UTC hour bucket, e.g. "ratelimit:<sender>:2026-09-12T14"
 * so counts reset naturally at the top of every hour without a cron job.
 */

function hourWindowKey(senderId: string, at: Date): string {
  const iso = at.toISOString(); // 2026-09-12T14:32:10.000Z
  const hourBucket = iso.slice(0, 13); // "2026-09-12T14"
  return `ratelimit:${senderId}:${hourBucket}`;
}

export function startOfNextHour(from: Date): Date {
  const next = new Date(from);
  next.setUTCMinutes(0, 0, 0);
  next.setUTCHours(next.getUTCHours() + 1);
  return next;
}

/**
 * Attempts to reserve one send slot for this sender in the current hour window.
 * Returns true if allowed (counter incremented), false if the sender is at/over limit
 * (counter is NOT incremented, so a rejected attempt doesn't itself count against them).
 */
export async function tryReserveSendSlot(
  senderId: string,
  hourlyLimit: number,
  now: Date = new Date()
): Promise<boolean> {
  const key = hourWindowKey(senderId, now);

  const current = await redisConnection.get(key);
  const count = current ? parseInt(current, 10) : 0;

  if (count >= hourlyLimit) {
    return false;
  }

  const newCount = await redisConnection.incr(key);
  if (newCount === 1) {
    // first write in this window — set expiry so old windows don't linger forever
    await redisConnection.expire(key, 3600 + 60);
  }

  // Race guard: if two workers both passed the check and both incremented,
  // whoever pushed the count over the limit backs off and releases their slot.
  if (newCount > hourlyLimit) {
    await redisConnection.decr(key);
    return false;
  }

  return true;
}
