import { getRecentEvents } from '@/lib/events';

export const runtime = 'nodejs';

function isValidToken(token) {
  return /^[a-zA-Z0-9_-]{16,128}$/.test(token || '');
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 200);

  if (!isValidToken(token)) {
    return Response.json({ ok: false, error: 'Invalid token' }, { status: 400 });
  }

  const events = await getRecentEvents(token, limit);
  return Response.json({ ok: true, events });
}
