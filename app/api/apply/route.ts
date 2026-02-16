import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { sql } from '@vercel/postgres'; 
import { authOptions } from "@/lib/auth"; 

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { roleTitle, answers } = body;

    const result = await sql`
      INSERT INTO applications (discord_id, username, role_title, answers, status)
      VALUES (${String(user.id)}, ${user.name}, ${roleTitle}, ${JSON.stringify(answers)}, 'pending')
      RETURNING id;
    `;

    return NextResponse.json({ ok: true, application: result.rows[0] }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}

export async function GET() { return NextResponse.json({ ok: true }); }