import { Router } from "express";
import { prisma } from "../db/prisma";
import { searchEmails } from "../lib/searchIndex";

export const emailsRouter = Router();

// GET /api/emails/scheduled
emailsRouter.get("/scheduled", async (_req, res) => {
  const emails = await prisma.email.findMany({
    where: { status: { in: ["pending", "scheduled"] } },
    orderBy: { scheduledAt: "asc" },
  });
  res.json(emails);
});

// GET /api/emails/sent
emailsRouter.get("/sent", async (_req, res) => {
  const emails = await prisma.email.findMany({
    where: { status: { in: ["sent", "failed"] } },
    orderBy: { sentAt: "desc" },
  });
  res.json(emails);
});

// GET /api/emails/search?q=...&status=sent
emailsRouter.get("/search", async (req, res) => {
  const q = String(req.query.q ?? "");
  const status = req.query.status ? String(req.query.status) : undefined;
  const results = await searchEmails(q, status);
  res.json(results);
});
