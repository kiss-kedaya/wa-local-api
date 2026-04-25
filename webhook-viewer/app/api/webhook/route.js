export const runtime = 'nodejs';

export async function GET() {
  return Response.json({
    ok: true,
    message: 'Open the homepage to generate a tokenized webhook URL, then POST to /api/webhook/{token}.'
  });
}

export async function POST() {
  return Response.json({
    ok: false,
    error: 'Missing token',
    message: 'Use /api/webhook/{token}. Open the homepage to generate your webhook URL.'
  }, { status: 400 });
}
