import { cleanupExpiredEvents } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();

  try {
    const result = await cleanupExpiredEvents();
    console.log('[cleanup:completed]', {
      requestId,
      ...result,
      durationMs: Date.now() - startedAt
    });

    return Response.json({ ok: true, requestId, ...result });
  } catch (err) {
    console.error('[cleanup:failed]', {
      requestId,
      message: err.message,
      stack: err.stack
    });

    return Response.json({ ok: false, error: 'Cleanup failed', message: err.message, requestId }, { status: 500 });
  }
}
