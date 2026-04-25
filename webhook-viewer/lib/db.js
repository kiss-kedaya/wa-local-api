import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not configured');
}

export const sql = neon(process.env.DATABASE_URL);

export async function ensureSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS webhook_events (
      id uuid PRIMARY KEY,
      received_at timestamptz NOT NULL,
      token text,
      content_type text,
      user_agent text,
      payload jsonb NOT NULL
    )
  `;
  await sql`ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS token text`;
  await sql`CREATE INDEX IF NOT EXISTS webhook_events_token_received_at_idx ON webhook_events (token, received_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS webhook_events_received_at_idx ON webhook_events (received_at)`;
}

export async function cleanupExpiredEvents() {
  await ensureSchema();
  await sql`DELETE FROM webhook_events WHERE received_at < now() - interval '1 hour'`;
}
