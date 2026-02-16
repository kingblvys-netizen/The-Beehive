import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";

export async function POST(req: Request) {
  try {
    // 1. Get the current secure session
    const session = await getServerSession();
    const body = await req.json();
    
    // 2. THE FIX: Fallback to session data if the form body is missing fields
    // Using names that exactly match your database table columns
    const discord_id = body.discord_id || (session?.user as any)?.id; 
    const username = body.username || session?.user?.name;
    const { roleTitle, answers } = body;

    // 3. Validation
    if (!discord_id || !username || !roleTitle) {
      console.error("Missing Identity Data:", { discord_id, username, roleTitle });
      return NextResponse.json(
        { message: 'Identity verification failed. Please re-login.' }, 
        { status: 400 }
      );
    }

    // 4. Save to Database
    // These column names match your successful SQL 'CREATE TABLE' command
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

    // 5. Success
    return NextResponse.json({ message: 'Success' }, { status: 200 });

  } catch (error) {
    console.error('Database insertion error:', error);
    return NextResponse.json(
      { message: 'Server error: Could not save application' }, 
      { status: 500 }
    );
  }
}