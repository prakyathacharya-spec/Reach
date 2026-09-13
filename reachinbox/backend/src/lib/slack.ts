import { prisma } from "../db/prisma";

/**
 * Fires a real Slack message the moment a sender's hourly limit is hit.
 * If the user hasn't connected Slack, this silently no-ops — never throws,
 * so a missing integration can never break the send pipeline.
 */
export async function notifyRateLimitHit(userId: string, senderName: string, hourlyLimit: number) {
  const integration = await prisma.slackIntegration.findUnique({ where: { userId } });
  if (!integration) return;

  try {
    await fetch(integration.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `:warning: Sender *${senderName}* hit its hourly limit of ${hourlyLimit} emails. Remaining emails have been rescheduled into the next hour window.`,
      }),
    });
  } catch (err) {
    // Log only — a failed Slack POST must never fail the underlying job
    console.error("Slack notification failed:", err);
  }
}
