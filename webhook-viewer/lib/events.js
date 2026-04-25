import { ensureSchema, sql } from './db';

export async function getRecentEvents(limit = 100) {
  await ensureSchema();

  const rows = await sql`
    SELECT id, received_at, content_type, user_agent, payload
    FROM webhook_events
    ORDER BY received_at DESC
    LIMIT ${limit}
  `;

  return rows.map(row => ({
    id: row.id,
    receivedAt: row.received_at,
    contentType: row.content_type,
    userAgent: row.user_agent,
    payload: row.payload
  }));
}
