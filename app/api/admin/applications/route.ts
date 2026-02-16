import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { rows } = await sql`
      SELECT id, discord_id, username, role_id, role_title, status, audit_note, created_at, answers
      FROM applications
      ORDER BY created_at DESC
    `;
    return NextResponse.json(rows);
  } catch (err: any) {
    console.error("[admin/applications] DB error:", err?.message || err);
    return NextResponse.json({ message: "Database connection failed" }, { status: 500 });
  }
}