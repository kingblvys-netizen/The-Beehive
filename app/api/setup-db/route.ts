import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 1. Create the 'applications' table securely
    // The 'IF NOT EXISTS' part prevents errors if you run this multiple times.
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

    // 2. Return success message
    return NextResponse.json({ message: 'Database Table Created Successfully' }, { status: 200 });
  } catch (error) {
    console.error('Setup Error:', error);
    return NextResponse.json({ error: 'Database creation failed' }, { status: 500 });
  }
}