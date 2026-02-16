import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    const body = await req.json();
    
    // Safety fallback: Get identity from session if body is missing it
    const discord_id = body.discord_id || (session?.user as any)?.id; 
    const username = body.username || session?.user?.name;
    const { roleTitle, answers } = body;

    if (!discord_id || !username || !roleTitle) {
      return NextResponse.json(
        { message: 'Identity verification failed. Please re-login.' }, 
        { status: 400 }
      );
    }

    // Save to Database with a default 'pending' status
    await sql`
      INSERT INTO applications (discord_id, username, role_title, status, answers)
      VALUES (
        ${discord_id}, 
        ${username}, 
        ${roleTitle}, 
        'pending', 
        ${JSON.stringify(answers)}
      );
    `;

    return NextResponse.json({ message: 'Success' }, { status: 200 });

  } catch (error) {
    console.error('Database Error:', error);
    return NextResponse.json(
      { message: 'Server error: Could not save application' }, 
      { status: 500 }
    );
  }
}