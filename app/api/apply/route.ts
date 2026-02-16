import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
// We use the standard Vercel Postgres import to ensure the SQL syntax is correct
import { sql } from '@vercel/postgres'; 
import { authOptions } from "@/lib/auth"; // Keep your auth import

export async function POST(req: Request) {
  try {
    // 1. Get the User Session
    const session = await getServerSession(authOptions);
    const user = session?.user as any;

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Identify the User
    // We try multiple fields to make sure we get a valid ID
    const userId = user.discordId || user.id || user.email || user.name;
    const username = user.name || "Anonymous";

    // 3. Get the Form Data
    const body = await req.json();
    // The frontend sends 'roleTitle', so we grab that. 
    const roleTitle = body.roleTitle || body.role || "General";
    const answers = body.answers || {};

    // 4. THE CRITICAL FIX: Database Insertion
    // We MUST use 'discord_id', 'username', and 'role_title' to match your Neon Database.
    // If you use 'user_id' or 'role' here, IT WILL CRASH.
    await sql`
      INSERT INTO applications (discord_id, username, role_title, answers, status)
      VALUES (
        ${String(userId)}, 
        ${username}, 
        ${roleTitle}, 
        ${JSON.stringify(answers)}, 
        'pending'
      );
    `;

    return NextResponse.json({ ok: true, message: "Application Saved" }, { status: 201 });

  } catch (err: any) {
    console.error("Database Error:", err);
    // This will print the specific reason (like "column does not exist") to your Vercel logs
    return NextResponse.json(
      { error: "Database transmission failed. Check logs for details." },
      { status: 500 }
    );
  }
}

// Keep the GET function so the Admin Panel can read this route if needed
export async function GET() {
  return NextResponse.json({ ok: true, message: "API is active" });
}