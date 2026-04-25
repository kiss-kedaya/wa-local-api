import { ensureSchema, sql } from '@/lib/db';

export const runtime = 'nodejs';

function isValidToken(token) {
  return /^[a-zA-Z0-9_-]{16,128}$/.test(token);
}

export async function POST(request, { params }) {
  const { token } = await params;

  if (!isValidToken(token)) {
    return Response.json({ ok: false, error: 'Invalid token' }, { status: 400 });
  }

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
    INSERT INTO webhook_events (id, received_at, token, content_type, user_agent, payload)
    VALUES (${id}, ${receivedAt}, ${token}, ${contentType}, ${request.headers.get('user-agent')}, ${JSON.stringify(payload)}::jsonb)
  `;

  return Response.json({ ok: true, id, receivedAt });
}

export async function GET(request, { params }) {
  const { token } = await params;
  return Response.json({ ok: true, webhookUrl: `/api/webhook/${token}` });
}
