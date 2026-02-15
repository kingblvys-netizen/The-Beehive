import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // This command creates the table in your Vercel Postgres database
    await sql`
      CREATE TABLE IF NOT EXISTS applications (
        id SERIAL PRIMARY KEY,
        discord_id VARCHAR(255) NOT NULL,
        discord_name VARCHAR(255) NOT NULL,
        role VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        answers JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    return NextResponse.json({ message: 'Database Table Created Successfully' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Database creation failed' }, { status: 500 });
  }
}