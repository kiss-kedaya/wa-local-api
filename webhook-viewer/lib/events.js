import { cleanupExpiredEvents, sql } from './db';

function mapEventRows(rows) {
  return rows.map(row => ({
    id: row.id,
    receivedAt: row.received_at,
    token: row.token,
    contentType: row.content_type,
    userAgent: row.user_agent,
    payload: row.payload
  }));
}

export async function getRecentEvents(token, limit = 100) {
  await cleanupExpiredEvents();

  const rows = await sql`
    SELECT id, received_at, token, content_type, user_agent, payload
    FROM webhook_events
    WHERE token = ${token}
    ORDER BY received_at DESC
    LIMIT ${limit}
  `;

  return mapEventRows(rows);
}

export async function getRecentEventsByPackageName(token, packageName, limit = 100) {
  await cleanupExpiredEvents();

  const rows = await sql`
    SELECT id, received_at, token, content_type, user_agent, payload
    FROM webhook_events
    WHERE token = ${token}
      AND payload->>'packageName' = ${packageName}
    ORDER BY received_at DESC
    LIMIT ${limit}
  `;

  return mapEventRows(rows);
}
