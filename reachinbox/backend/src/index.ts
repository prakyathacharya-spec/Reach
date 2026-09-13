import express from "express";
import cors from "cors";
import cookieSession from "cookie-session";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { env } from "./config/env";
import { emailQueue } from "./queues/emailQueue";
import { scheduleRouter } from "./routes/schedule";
import { emailsRouter } from "./routes/emails";
import { googleAuthRouter } from "./routes/auth/google";
import { slackAuthRouter } from "./routes/auth/slack";
import { ensureIndex } from "./lib/searchIndex";
import { meRouter } from "./routes/me";

const app = express();

app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(
  cookieSession({
    name: "session",
    secret: env.SESSION_SECRET,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  })
);

// Live BullMQ dashboard — required "expose a live BullMQ dashboard" item
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");
createBullBoard({
  queues: [new BullMQAdapter(emailQueue)],
  serverAdapter,
});
app.use("/admin/queues", serverAdapter.getRouter());

app.use("/api/schedule", scheduleRouter);
app.use("/api/emails", emailsRouter);
app.use("/auth/google", googleAuthRouter);
app.use("/auth/slack", slackAuthRouter);
app.use("/api/me", meRouter);

app.get("/health", (_req, res) => res.json({ ok: true }));

ensureIndex().catch((e) => console.error("ES index setup failed:", e));

app.listen(env.PORT, () => {
  console.log(`API listening on :${env.PORT}`);
  console.log(`Queue dashboard: http://localhost:${env.PORT}/admin/queues`);
});
