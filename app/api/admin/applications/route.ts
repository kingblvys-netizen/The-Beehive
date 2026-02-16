import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";

const ADMIN_IDS = ["1208908529411301387", "1406555930769756161", "1241945084346372247"];

export async function GET() { // MUST BE GET
  try {
    const session = await getServerSession();
    const userId = (session?.user as any)?.id;

    if (!session || !ADMIN_IDS.includes(userId)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { rows } = await sql`
      SELECT * FROM applications ORDER BY created_at DESC
    `;
    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: 'Fetch failed' }, { status: 500 });
  }
}