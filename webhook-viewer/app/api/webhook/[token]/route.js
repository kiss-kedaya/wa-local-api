import { cleanupExpiredEvents, sql } from '@/lib/db';

export const runtime = 'nodejs';

function isValidToken(token) {
  return /^[a-zA-Z0-9_-]{6,64}$/.test(token);
}

function tokenPreview(token) {
  return `${token.slice(0, 8)}...${token.slice(-6)}`;
}

export async function POST(request, { params }) {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  const { token } = await params;

  console.log('[webhook:received]', {
    requestId,
    token: token ? tokenPreview(token) : null,
    method: request.method,
    contentType: request.headers.get('content-type') || '',
    userAgent: request.headers.get('user-agent') || '',
    contentLength: request.headers.get('content-length') || null
  });

  if (!isValidToken(token)) {
    console.warn('[webhook:invalid-token]', { requestId, tokenLength: token?.length || 0 });
    return Response.json({ ok: false, error: 'Invalid token', requestId }, { status: 400 });
  }

  try {
    const id = crypto.randomUUID();
    const receivedAt = new Date().toISOString();
    const contentType = request.headers.get('content-type') || '';
    const rawBody = await request.text();
    let payload = rawBody;
    let parsedAsJson = false;

    if (contentType.includes('application/json')) {
      try {
        payload = JSON.parse(rawBody || '{}');
        parsedAsJson = true;
      } catch (err) {
        console.warn('[webhook:json-parse-failed]', {
          requestId,
          message: err.message,
          rawBodyPreview: rawBody.slice(0, 300)
        });
      }
    }

    console.log('[webhook:parsed]', {
      requestId,
      id,
      parsedAsJson,
      rawBodyLength: rawBody.length,
      payloadType: typeof payload,
      payloadKeys: payload && typeof payload === 'object' ? Object.keys(payload).slice(0, 20) : []
    });

    await cleanupExpiredEvents();

    const title = payload && typeof payload === 'object' ? String(payload.title || '') : '';
    if (!title || !/^(GoPay|Gojek Indonesia)$/i.test(title)) {
      console.log('[webhook:ignored]', {
        requestId,
        token: tokenPreview(token),
        title: title || null,
        durationMs: Date.now() - startedAt
      });
      return Response.json({ ok: true, ignored: true, reason: 'Only GoPay / Gojek Indonesia notifications are accepted', requestId });
    }

    if (payload.text) {
      const duplicateRows = await sql`
        SELECT id
        FROM webhook_events
        WHERE token = ${token}
          AND payload->>'text' = ${String(payload.text)}
        LIMIT 1
      `;

      if (duplicateRows.length > 0) {
        console.log('[webhook:duplicate]', {
          requestId,
          token: tokenPreview(token),
          text: payload.text,
          existingId: duplicateRows[0].id,
          durationMs: Date.now() - startedAt
        });
        return Response.json({ ok: true, ignored: true, duplicate: true, reason: 'Duplicate text', requestId });
      }
    }

    await sql`
      INSERT INTO webhook_events (id, received_at, token, content_type, user_agent, payload)
      VALUES (${id}, ${receivedAt}, ${token}, ${contentType}, ${request.headers.get('user-agent')}, ${JSON.stringify(payload)}::jsonb)
    `;

    console.log('[webhook:stored]', {
      requestId,
      id,
      token: tokenPreview(token),
      durationMs: Date.now() - startedAt
    });

    return Response.json({ ok: true, id, receivedAt, requestId });
  } catch (err) {
    console.error('[webhook:failed]', {
      requestId,
      token: tokenPreview(token),
      message: err.message,
      stack: err.stack
    });

    return Response.json({ ok: false, error: 'Webhook processing failed', message: err.message, requestId }, { status: 500 });
  }
}

export async function GET(request, { params }) {
  const { token } = await params;
  console.log('[webhook:info]', { token: token ? tokenPreview(token) : null });
  return Response.json({ ok: true, webhookUrl: `/api/webhook/${token}` });
}
