import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";

// REPLACE WITH YOUR EXACT DISCORD ID (Same as in your admin page)
const ADMIN_IDS = ["1208908529411301387"]; 

export async function GET(req: Request) {
  try {
    // 1. Security Check
    const session = await getServerSession();
    const userId = (session?.user as any)?.id;

    if (!session || !ADMIN_IDS.includes(userId)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // 2. Fetch Data (Newest first)
    const { rows } = await sql`SELECT * FROM applications ORDER BY created_at DESC`;

    // 3. Return to Dashboard
    return NextResponse.json(rows, { status: 200 });

  } catch (error) {
    console.error('Fetch Error:', error);
    return NextResponse.json({ message: 'Failed to fetch data' }, { status: 500 });
  }
}