import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";

// --- AUTHORIZED ADMINS ---
// These IDs must match the ones in your app/page.tsx and app/admin/page.tsx
const ADMIN_IDS = [
  "1208908529411301387", // King B
  "1406555930769756161", // Admin 2
  "1241945084346372247"  // Admin 3
];

export async function GET(req: Request) {
  try {
    // 1. Security Check: Verify the session and the Discord ID
    const session = await getServerSession();
    const userId = (session?.user as any)?.id;

    if (!session || !ADMIN_IDS.includes(userId)) {
      return NextResponse.json({ message: 'Unauthorized Access' }, { status: 401 });
    }

    // 2. Fetch Data: Pull all applications from the database
    // Ensure you have already run the /api/setup-db route to create this table
    const { rows } = await sql`SELECT * FROM applications ORDER BY created_at DESC`;

    // 3. Return Data to the Admin Dashboard
    return NextResponse.json(rows, { status: 200 });

  } catch (error) {
    console.error('Database Fetch Error:', error);
    return NextResponse.json({ message: 'Failed to retrieve records' }, { status: 500 });
  }
}