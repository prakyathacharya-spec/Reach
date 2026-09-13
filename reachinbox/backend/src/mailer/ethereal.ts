import nodemailer from "nodemailer";
import { env } from "../config/env";

/**
 * Builds a transporter for a specific sender's Ethereal test account.
 * Each Sender row stores its own etherealUser/etherealPass (created via
 * nodemailer.createTestAccount() once, at sender-creation time — see
 * README "Setting up Ethereal" section) so the system supports multiple senders.
 */
export function buildTransporter(etherealUser: string, etherealPass: string) {
  return nodemailer.createTransport({
    host: env.ETHEREAL_HOST,
    port: env.ETHEREAL_PORT,
    secure: false,
    auth: { user: etherealUser, pass: etherealPass },
  });
}

export async function sendMail(opts: {
  etherealUser: string;
  etherealPass: string;
  to: string;
  subject: string;
  html: string;
}) {
  const transporter = buildTransporter(opts.etherealUser, opts.etherealPass);
  const info = await transporter.sendMail({
    from: opts.etherealUser,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
  // Ethereal gives back a preview URL — useful to show in the demo video
  return { messageId: info.messageId, previewUrl: nodemailer.getTestMessageUrl(info) };
}
