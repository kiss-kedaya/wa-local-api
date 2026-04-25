import { ensureSchema, sql } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(request) {
  const id = crypto.randomUUID();
  const receivedAt = new Date().toISOString();
  const contentType = request.headers.get('content-type') || '';
  const rawBody = await request.text();
  let payload = rawBody;

  if (contentType.includes('application/json')) {
    try {
      payload = JSON.parse(rawBody || '{}');
    } catch {
      payload = rawBody;
    }
  }

  await ensureSchema();
  await sql`
    INSERT INTO webhook_events (id, received_at, content_type, user_agent, payload)
    VALUES (${id}, ${receivedAt}, ${contentType}, ${request.headers.get('user-agent')}, ${JSON.stringify(payload)}::jsonb)
  `;

  return Response.json({ ok: true, id, receivedAt });
}

export async function GET() {
  return Response.json({ ok: true, message: 'POST notification payloads to this endpoint.' });
}
