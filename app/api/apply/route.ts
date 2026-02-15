import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { roleTitle, username, discord_id, answers } = body;

    // 1. Validate that we have the necessary data
    if (!discord_id || !username || !roleTitle) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    // 2. Insert the application into your Postgres database
    // This uses the 'applications' table you created earlier
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

    // 3. Return a success message to the frontend
    return NextResponse.json({ message: 'Success' }, { status: 200 });

  } catch (error) {
    // Log the error to your Vercel console so you can see it in the 'Logs' tab
    console.error('Database insertion error:', error);
    
    return NextResponse.json(
      { message: 'Server error: Could not save application' }, 
      { status: 500 }
    );
  }
}