import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql } from "@/lib/db";

export async function GET() {
  return NextResponse.json({ ok: true, route: "/api/apply" });
}

export async function POST(req: Request) {
  try {
    // 1. Authentication Check
    const session = await getServerSession(authOptions);
    const user = session?.user as
      | { id?: string; discordId?: string; name?: string; email?: string }
      | undefined;

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized: no session" }, { status: 401 });
    }

    // 2. Identity Resolution
    const userId = user?.discordId || user?.id || user?.email || user?.name;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized: no user id" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);

    // 3. Data Formatting
    // We check for 'roleTitle' because that is what your frontend sends
    const rawRole = body?.roleTitle || body?.role;
    const role =
      typeof rawRole === "string" && rawRole.trim().length > 0
        ? rawRole.trim()
        : "general";

    const answers =
      body?.answers && typeof body.answers === "object"
        ? body.answers
        : body && typeof body === "object"
        ? body
        : null;

    if (!answers) {
      return NextResponse.json(
        { error: "Missing answers payload" },
        { status: 400 }
      );
    }

    // 4. Database Insertion (THE FIX)
    // We explicitly use 'discord_id', 'username', and 'role_title' to match your database
    const rows = await sql`
      INSERT INTO applications (discord_id, username, role_title, answers, status)
      VALUES (
        ${String(userId)}, 
        ${user?.name ?? "Anonymous"}, 
        ${role}, 
        ${JSON.stringify(answers)}, 
        'pending'
      )
      RETURNING id, discord_id, username, role_title, status, created_at;
    `;

    return NextResponse.json({ ok: true, application: rows[0] }, { status: 201 });

  } catch (err: any) {
    console.error("[/api/apply] Database Error details:", {
      message: err?.message,
      code: err?.code, 
      detail: err?.detail,
    });

    return NextResponse.json(
      { error: err?.message ?? "Failed to submit application" },
      { status: 500 }
    );
  }
}