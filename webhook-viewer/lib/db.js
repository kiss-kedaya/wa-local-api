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
      content_type text,
      user_agent text,
      payload jsonb NOT NULL
    )
  `;
}
