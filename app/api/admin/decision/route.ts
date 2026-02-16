import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";

const ADMIN_IDS = ["1208908529411301387", "1406555930769756161", "1241945084346372247"];

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    const userId = (session?.user as any)?.id;

    if (!session || !ADMIN_IDS.includes(userId)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { applicationId, status } = await req.json();

    await sql`UPDATE applications SET status = ${status} WHERE id = ${applicationId}`;
    return NextResponse.json({ message: 'Status updated' });
  } catch (error) {
    return NextResponse.json({ message: 'Update failed' }, { status: 500 });
  }
}