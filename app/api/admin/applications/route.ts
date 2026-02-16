import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Ensure this import points to your auth config

const ADMIN_IDS = [
  "1208908529411301387", 
  "1406555930769756161", 
  "1241945084346372247"
];

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    // DEBUGGING: Log exactly what the session sees
    console.log("ADMIN DEBUG - Session User:", session?.user);
    
    // We try to grab the ID from multiple possible locations
    const user = session?.user as any;
    const userId = user?.id || user?.discordId || user?.sub;

    console.log("ADMIN DEBUG - Detected ID:", userId);

    // TEMPORARY: If this is still blocking you, comment out this IF block to test
    if (!session || !ADMIN_IDS.includes(userId)) {
      console.log(`ADMIN BLOCKED: User ${userId} is not in the list.`);
      return NextResponse.json({ message: 'Unauthorized', debug_id: userId }, { status: 401 });
    }

    const { rows } = await sql`
      SELECT id, discord_id, username, role_title as role, status, answers, created_at 
      FROM applications 
      ORDER BY created_at DESC
    `;

    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error('Admin Error:', error);
    return NextResponse.json({ message: 'Server Error' }, { status: 500 });
  }
}