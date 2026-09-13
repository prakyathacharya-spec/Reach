import "dotenv/config";

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const env = {
  PORT: Number(process.env.PORT ?? 4000),
  DATABASE_URL: required("DATABASE_URL", "postgresql://reachinbox:reachinbox@localhost:5432/reachinbox"),
  REDIS_URL: required("REDIS_URL", "redis://localhost:6379"),
  ELASTICSEARCH_URL: required("ELASTICSEARCH_URL", "http://localhost:9200"),

  ETHEREAL_HOST: required("ETHEREAL_HOST", "smtp.ethereal.email"),
  ETHEREAL_PORT: Number(process.env.ETHEREAL_PORT ?? 587),

  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ?? "",
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ?? "",
  GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL ?? "http://localhost:4000/auth/google/callback",

  SLACK_CLIENT_ID: process.env.SLACK_CLIENT_ID ?? "",
  SLACK_CLIENT_SECRET: process.env.SLACK_CLIENT_SECRET ?? "",
  SLACK_REDIRECT_URI: process.env.SLACK_REDIRECT_URI ?? "http://localhost:4000/auth/slack/callback",

  SESSION_SECRET: required("SESSION_SECRET", "dev-secret-change-me"),

  // Rate limiting defaults — overridable per campaign via API, these are the global fallback
  DEFAULT_MIN_DELAY_MS: Number(process.env.DEFAULT_MIN_DELAY_MS ?? 2000),
  DEFAULT_MAX_EMAILS_PER_HOUR: Number(process.env.DEFAULT_MAX_EMAILS_PER_HOUR ?? 200),

  WORKER_CONCURRENCY: Number(process.env.WORKER_CONCURRENCY ?? 5),

  FRONTEND_URL: process.env.FRONTEND_URL ?? "http://localhost:3000",
};
