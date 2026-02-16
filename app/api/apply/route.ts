import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { sql } from '@vercel/postgres'; 
import { authOptions } from "@/lib/auth"; 

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Safety Identity Check
    const userId = user.discordId || user.id || user.email || user.name;
    const username = user.name || "Anonymous";

    const body = await req.json();
    const roleTitle = body.roleTitle || body.role || "General";
    const answers = body.answers || {};

    // THE DATABASE SAVE COMMAND
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
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, message: "API Active" });
}