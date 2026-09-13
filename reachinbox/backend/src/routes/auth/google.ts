import { Router } from "express";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "../../db/prisma";
import { env } from "../../config/env";

export const googleAuthRouter = Router();

const client = new OAuth2Client(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, env.GOOGLE_CALLBACK_URL);

googleAuthRouter.get("/", (_req, res) => {
  const url = client.generateAuthUrl({
    access_type: "offline",
    scope: ["openid", "email", "profile"],
    prompt: "consent",
  });
  res.redirect(url);
});

googleAuthRouter.get("/callback", async (req, res) => {
  try {
    const code = String(req.query.code);
    const { tokens } = await client.getToken(code);
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token!,
      audience: env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email) throw new Error("Invalid Google payload");

    const user = await prisma.user.upsert({
      where: { googleId: payload.sub },
      update: { name: payload.name ?? "", avatarUrl: payload.picture ?? null },
      create: {
        googleId: payload.sub,
        email: payload.email,
        name: payload.name ?? payload.email,
        avatarUrl: payload.picture ?? null,
      },
    });

    // Real app: sign a session cookie / JWT here. Kept minimal for the assignment scope.
    (req.session as any).userId = user.id;
    res.redirect(`${env.FRONTEND_URL}/dashboard`);
  } catch (err) {
    console.error("Google auth failed:", err);
    res.redirect(`${env.FRONTEND_URL}/login?error=google_auth_failed`);
  }
});

googleAuthRouter.post("/logout", (req, res) => {
  req.session = null;
  res.json({ ok: true });
});
