import { getRecentEvents } from '@/lib/events';

export const runtime = 'nodejs';

function isValidToken(token) {
  return /^[a-zA-Z0-9_-]{6,64}$/.test(token || '');
}

function tokenPreview(token) {
  return `${token.slice(0, 8)}...${token.slice(-6)}`;
}

export async function GET(request) {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 200);

  console.log('[events:received]', {
    requestId,
    token: token ? tokenPreview(token) : null,
    limit,
    userAgent: request.headers.get('user-agent') || ''
  });

  if (!isValidToken(token)) {
    console.warn('[events:invalid-token]', { requestId, tokenLength: token?.length || 0 });
    return Response.json({ ok: false, error: 'Invalid token', requestId }, { status: 400 });
  }

  try {
    const events = await getRecentEvents(token, limit);
    console.log('[events:returned]', {
      requestId,
      token: tokenPreview(token),
      count: events.length,
      latestReceivedAt: events[0]?.receivedAt || null,
      durationMs: Date.now() - startedAt
    });
    return Response.json({ ok: true, events, requestId });
  } catch (err) {
    console.error('[events:failed]', {
      requestId,
      token: tokenPreview(token),
      message: err.message,
      stack: err.stack
    });
    return Response.json({ ok: false, error: 'Failed to load events', message: err.message, requestId }, { status: 500 });
  }
}
