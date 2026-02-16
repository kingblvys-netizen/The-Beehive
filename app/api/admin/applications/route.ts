import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";

// --- AUTHORIZED ADMIN LIST ---
const ADMIN_IDS = [
  "1208908529411301387", // King B
  "1406555930769756161", // Admin 2
  "1241945084346372247"  // Admin 3
];

export async function GET() {
  try {
    const session = await getServerSession();
    const userId = (session?.user as any)?.id;

    if (!session || !ADMIN_IDS.includes(userId)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Fetches the specific columns confirmed in Neon
    const { rows } = await sql`
      SELECT id, discord_id, username, role_title, status, answers, created_at 
      FROM applications 
      ORDER BY created_at DESC
    `;

    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error('Admin Fetch Error:', error);
    return NextResponse.json({ message: 'Fetch failed' }, { status: 500 });
  }
}