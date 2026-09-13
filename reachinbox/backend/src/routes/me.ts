import { Router } from "express";
import { prisma } from "../db/prisma";

export const meRouter = Router();

meRouter.get("/", async (req, res) => {
  const userId = (req.session as any)?.userId;
  if (!userId) return res.status(401).json({ error: "not_logged_in" });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ error: "user_not_found" });

  res.json({ id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl });
});

meRouter.get("/senders", async (req, res) => {
  const userId = (req.session as any)?.userId;
  if (!userId) return res.status(401).json({ error: "not_logged_in" });

  const senders = await prisma.sender.findMany({ where: { userId } });
  res.json(senders.map((s: { id: string; name: string }) => ({ id: s.id, name: s.name })));
});
