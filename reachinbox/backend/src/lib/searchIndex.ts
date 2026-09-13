import { Client } from "@elastic/elasticsearch";
import { env } from "../config/env";
import type { Email } from "@prisma/client";

export const esClient = new Client({ node: env.ELASTICSEARCH_URL });

export const EMAILS_INDEX = "emails";

export async function ensureIndex() {
  const exists = await esClient.indices.exists({ index: EMAILS_INDEX });
  if (!exists) {
    await esClient.indices.create({
      index: EMAILS_INDEX,
      mappings: {
        properties: {
          recipient: { type: "keyword" },
          subject: { type: "text" },
          status: { type: "keyword" },
          scheduledAt: { type: "date" },
          sentAt: { type: "date" },
          campaignId: { type: "keyword" },
          senderId: { type: "keyword" },
        },
      },
    });
  }
}

// Write-through: call this any time an Email row is created or its status changes.
export async function indexEmail(email: Email) {
  await esClient.index({
    index: EMAILS_INDEX,
    id: email.id,
    document: {
      recipient: email.recipient,
      subject: email.subject,
      status: email.status,
      scheduledAt: email.scheduledAt,
      sentAt: email.sentAt,
      campaignId: email.campaignId,
      senderId: email.senderId,
    },
  });
}

export async function searchEmails(query: string, status?: string) {
  const must: any[] = [];
  if (query) {
    must.push({ multi_match: { query, fields: ["recipient", "subject"] } });
  }
  if (status) {
    must.push({ term: { status } });
  }
  const result = await esClient.search({
    index: EMAILS_INDEX,
    query: must.length ? { bool: { must } } : { match_all: {} },
    sort: [{ scheduledAt: "desc" }],
    size: 100,
  });
  return result.hits.hits.map((h) => h._source);
}
