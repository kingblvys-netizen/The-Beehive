import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getServerSession } from "next-auth";

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { roleId, isOpen } = await req.json();

    await sql`
      INSERT INTO role_settings (role_id, is_open)
      VALUES (${roleId}, ${isOpen})
      ON CONFLICT (role_id) 
      DO UPDATE SET is_open = ${isOpen};
    `;

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { rows } = await sql`SELECT * FROM role_settings`;
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json([]);
  }
}