import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { neon } from "@neondatabase/serverless";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { roleId, roleTitle, answers } = await req.json();

    if (!roleId || !roleTitle || !answers || typeof answers !== "object") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      return NextResponse.json({ error: "Missing DATABASE_URL" }, { status: 500 });
    }

    const sql = neon(dbUrl);

    const rows = await sql`
      INSERT INTO applications (discord_id, username, role_id, role_title, answers, status)
      VALUES (${String(user.id)}, ${String(user.name ?? "Unknown")}, ${String(roleId)}, ${String(roleTitle)}, ${JSON.stringify(answers)}, 'pending')
      RETURNING id
    `;

    return NextResponse.json({ ok: true, id: rows[0]?.id }, { status: 201 });
  } catch (err: any) {
    console.error("[apply] submit failed:", err?.message || err);
    return NextResponse.json({ error: err?.message || "Submit failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}