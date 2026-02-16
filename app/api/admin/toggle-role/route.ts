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

    const { roleId, isOpen } = await req.json();

    // This updates the status in your database
    await sql`UPDATE roles SET is_open = ${isOpen} WHERE id = ${roleId}`;

    return NextResponse.json({ message: 'Status Updated' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: 'Error' }, { status: 500 });
  }
}