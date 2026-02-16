import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ADMIN_IDS } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id?: string; discordId?: string } | undefined;
    const adminId = String(user?.id || user?.discordId || "");

    if (!session || !ADMIN_IDS.includes(adminId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { rows } = await sql`
      SELECT id, discord_id, username, role_id, role_title, status, audit_note, created_at, answers
      FROM applications
      ORDER BY created_at DESC
    `;
    return NextResponse.json(rows);
  } catch (err: unknown) {
    console.error("[admin/applications] DB error:", toErrorMessage(err));
    return NextResponse.json({ message: "Database connection failed" }, { status: 500 });
  }
}