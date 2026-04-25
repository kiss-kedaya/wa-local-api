import { ensureSchema, sql } from './db';

export async function getRecentEvents(token, limit = 100) {
  await ensureSchema();

  const rows = await sql`
    SELECT id, received_at, token, content_type, user_agent, payload
    FROM webhook_events
    WHERE token = ${token}
    ORDER BY received_at DESC
    LIMIT ${limit}
  `;

  return rows.map(row => ({
    id: row.id,
    receivedAt: row.received_at,
    token: row.token,
    contentType: row.content_type,
    userAgent: row.user_agent,
    payload: row.payload
  }));
}
