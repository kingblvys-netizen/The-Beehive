import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// Force dynamic ensures we always get the latest DB state, not a cached version
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    
    // 1. Identification: Retrieve the unique Discord identifier from the session
    const userId = user?.id || user?.discordId || user?.sub;

    if (!session || !userId) {
      return NextResponse.json({ message: 'Unauthorized Access' }, { status: 401 });
    }

    // 2. Synchronization Query: Fetch all application statuses for this specific user
    // This allows the homepage to accurately display 'Under Review' or unlock the button
    const { rows } = await sql`
      SELECT id, role_title, status, created_at 
      FROM applications 
      WHERE discord_id = ${String(userId)}
      ORDER BY created_at DESC
    `;

    // Return the user's application history to sync the frontend
    return NextResponse.json(rows, { status: 200 });

  } catch (error) {
    console.error('Core Sync Failure:', error);
    return NextResponse.json({ message: 'Database Satellite Uplink Failed' }, { status: 500 });
  }
}