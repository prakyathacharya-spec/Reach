import { Router } from "express";
import { prisma } from "../../db/prisma";
import { env } from "../../config/env";

export const slackAuthRouter = Router();

// GET /auth/slack/start — user clicks "Connect Slack" in the dashboard
slackAuthRouter.get("/start", (req, res) => {
  const userId = (req.session as any)?.userId;
  if (!userId) return res.status(401).send("Not logged in");

  const params = new URLSearchParams({
    client_id: env.SLACK_CLIENT_ID,
    scope: "incoming-webhook,chat:write",
    redirect_uri: env.SLACK_REDIRECT_URI,
    state: userId, // ties the callback back to the right user
  });
  res.redirect(`https://slack.com/oauth/v2/authorize?${params.toString()}`);
});

// GET /auth/slack/callback
slackAuthRouter.get("/callback", async (req, res) => {
  try {
    const code = String(req.query.code);
    const userId = String(req.query.state);

    const tokenRes = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env.SLACK_CLIENT_ID,
        client_secret: env.SLACK_CLIENT_SECRET,
        code,
        redirect_uri: env.SLACK_REDIRECT_URI,
      }),
    });
    const data = (await tokenRes.json()) as {
      ok: boolean;
      error?: string;
      incoming_webhook?: { url: string };
      team?: { name?: string };
    };
    if (!data.ok || !data.incoming_webhook) throw new Error(data.error ?? "slack_oauth_failed");

    const webhookUrl = data.incoming_webhook.url;
    const teamName = data.team?.name ?? null;

    await prisma.slackIntegration.upsert({
      where: { userId },
      update: { webhookUrl, teamName },
      create: { userId, webhookUrl, teamName },
    });

    res.redirect(`${env.FRONTEND_URL}/dashboard?slack=connected`);
  } catch (err) {
    console.error("Slack auth failed:", err);
    res.redirect(`${env.FRONTEND_URL}/dashboard?slack=failed`);
  }
});

// POST /auth/slack/disconnect
slackAuthRouter.post("/disconnect", async (req, res) => {
  const userId = (req.session as any)?.userId;
  if (!userId) return res.status(401).json({ error: "not_logged_in" });
  await prisma.slackIntegration.deleteMany({ where: { userId } });
  res.json({ ok: true });
});
