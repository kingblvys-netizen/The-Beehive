import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres'; // Standard Vercel Import
import { getServerSession } from "next-auth/next";

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    const body = await req.json();

    // 1. SIMPLE IDENTITY CHECK
    // We try to get the ID from the form first, then the session
    const discord_id = body.discord_id || (session?.user as any)?.id;
    const username = body.username || session?.user?.name || "Unknown User";
    
    // 2. GET THE ROLE
    // The frontend sends 'roleTitle', but we check 'role' just in case
    const roleTitle = body.roleTitle || body.role;

    // 3. STOP IF DATA IS MISSING
    if (!discord_id || !roleTitle) {
      return NextResponse.json({ message: 'Missing User ID or Role' }, { status: 400 });
    }

    // 4. THE SAVE (Using the CORRECT column names)
    // database: discord_id, username, role_title
    await sql`
      INSERT INTO applications (discord_id, username, role_title, status, answers)
      VALUES (
        ${discord_id}, 
        ${username}, 
        ${roleTitle}, 
        'pending', 
        ${JSON.stringify(body.answers)}
      );
    `;

    return NextResponse.json({ message: 'Application Sent' }, { status: 200 });

  } catch (error) {
    console.error('Reset Code Error:', error);
    return NextResponse.json({ message: 'Server Error' }, { status: 500 });
  }
}