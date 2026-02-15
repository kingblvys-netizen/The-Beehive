import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";

export async function POST(req: Request) {
  try {
    // 1. Get the current logged-in session
    const session = await getServerSession();
    const body = await req.json();
    
    // 2. Extract identity data from the session if not in the body
    const discord_id = body.discord_id || (session?.user as any)?.id; 
    const username = body.username || session?.user?.name;
    const { roleTitle, answers } = body;

    // 3. Security check: If there is no ID, the user isn't logged in properly
    if (!discord_id || !username || !roleTitle) {
      return NextResponse.json({ message: 'Missing ID or Name' }, { status: 400 });
    }

    // 4. Insert the application into your Postgres database
    await sql`
      INSERT INTO applications (discord_id, discord_name, role, status, answers)
      VALUES (
        ${discord_id}, 
        ${username}, 
        ${roleTitle}, 
        'pending', 
        ${JSON.stringify(answers)}
      );
    `;

    // 5. Success response back to the browser
    return NextResponse.json({ message: 'Success' }, { status: 200 });

  } catch (error) {
    // Log the error to your Vercel runtime logs for debugging
    console.error('Database insertion error:', error);
    
    return NextResponse.json(
      { message: 'Server error: Could not save application' }, 
      { status: 500 }
    );
  }
}