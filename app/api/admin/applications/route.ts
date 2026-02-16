import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getServerSession } from "next-auth/next";

// --- AUTHORIZED ADMINS ---
// These are the Discord IDs allowed to see the dashboard.
const ADMIN_IDS = [
  "1208908529411301387", // King B
  "1406555930769756161", // Admin 2
  "1241945084346372247"  // Admin 3
];

// Force the server to always fetch fresh data (fixes "stale" lists)
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Security Check
    const session = await getServerSession();
    const userId = (session?.user as any)?.id;

    if (!session || !ADMIN_IDS.includes(userId)) {
      return NextResponse.json({ message: 'Unauthorized Access' }, { status: 401 });
    }

    // 2. Fetch Data with "Alias" Fix
    // We select 'role_title' but tell the code to treat it as 'role'.
    // This tricks the frontend into displaying the data correctly.
    const { rows } = await sql`
      SELECT 
        id, 
        discord_id, 
        username, 
        role_title as role, 
        status, 
        answers, 
        created_at 
      FROM applications 
      ORDER BY created_at DESC;
    `;

    // 3. Success
    return NextResponse.json(rows, { status: 200 });

  } catch (error) {
    console.error('Admin Fetch Error:', error);
    return NextResponse.json({ message: 'Failed to retrieve records' }, { status: 500 });
  }
}