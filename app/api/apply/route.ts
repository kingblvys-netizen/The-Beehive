import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    const body = await req.json();
    
    // Safety: ensure identity is valid
    const discord_id = body.discord_id || (session?.user as any)?.id; 
    const username = body.username || session?.user?.name;
    const { roleTitle, answers } = body; // 'roleTitle' from the frontend form

    if (!discord_id || !username || !roleTitle) {
      return NextResponse.json({ message: 'Identity missing' }, { status: 400 });
    }

    // MATCHES NEON SQL: username, role_title
    // If you use 'roleTitle' here, the server will crash with a 500 error.
    await sql`
      INSERT INTO applications (discord_id, username, role_title, status, answers)
      VALUES (${discord_id}, ${username}, ${roleTitle}, 'pending', ${JSON.stringify(answers)});
    `;

    return NextResponse.json({ message: 'Success' }, { status: 200 });
  } catch (error) {
    console.error('Database Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}