import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    
    // 1. Identification: Grab the ID from the session provider
    const userId = user?.id || user?.discordId || user?.sub;

    if (!session || !userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // 2. Synchronization Query: Fetch only this user's records
    // This allows the homepage to see if a record was DELETED (Purged)
    const { rows } = await sql`
      SELECT id, role_title, status, created_at 
      FROM applications 
      WHERE discord_id = ${String(userId)}
      ORDER BY created_at DESC
    `;

    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error('User Sync Error:', error);
    return NextResponse.json({ message: 'Database Uplink Failed' }, { status: 500 });
  }
}