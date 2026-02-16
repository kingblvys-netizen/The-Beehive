import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";

// --- AUTHORIZED ADMIN LIST ---
// Must match all other admin-restricted files
const ADMIN_IDS = [
  "1208908529411301387", // King B
  "1406555930769756161", // Admin 2
  "1241945084346372247"  // Admin 3
];

export async function POST(req: Request) {
  try {
    // 1. Security Check: Verify session and Admin ID
    const session = await getServerSession();
    const userId = (session?.user as any)?.id;

    if (!session || !ADMIN_IDS.includes(userId)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // 2. Data Extraction
    const { applicationId, status } = await req.json(); // status will be 'approved' or 'declined'

    // 3. Validation: Ensure we have a valid ID and allowed status
    if (!applicationId || !['approved', 'declined'].includes(status)) {
      return NextResponse.json({ message: 'Invalid Protocol Data' }, { status: 400 });
    }

    // 4. Update Database
    // Targets the 'status' column verified in your SQL execution
    const result = await sql`
      UPDATE applications 
      SET status = ${status} 
      WHERE id = ${applicationId}
    `;

    // 5. Verify the update actually happened
    if (result.rowCount === 0) {
      return NextResponse.json({ message: 'Record not found in database' }, { status: 404 });
    }

    return NextResponse.json({ message: `Application status updated to: ${status}` }, { status: 200 });
  } catch (error) {
    console.error('Decision Update Error:', error);
    return NextResponse.json({ message: 'Database transmission failed' }, { status: 500 });
  }
}