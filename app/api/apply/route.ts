import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    const body = await req.json();
    
    const discord_id = body.discord_id || (session?.user as any)?.id; 
    const username = body.username || session?.user?.name;
    const { roleTitle, answers } = body;

    if (!discord_id || !username || !roleTitle) {
      return NextResponse.json({ message: 'Identity verification failed.' }, { status: 400 });
    }

    // MATCHES NEON SQL EXACTLY
    await sql`
      INSERT INTO applications (discord_id, username, role_title, status, answers)
      VALUES (${discord_id}, ${username}, ${roleTitle}, 'pending', ${JSON.stringify(answers)});
    `;

    return NextResponse.json({ message: 'Success' }, { status: 200 });
  } catch (error) {
    console.error('Database Error:', error);
    return NextResponse.json({ message: 'Database rejection' }, { status: 500 });
  }
}