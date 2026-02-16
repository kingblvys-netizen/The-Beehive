import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql } from "@/lib/db";

function isAdmin(discordId?: string) {
  const ids = (process.env.ADMIN_DISCORD_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return !!discordId && ids.includes(discordId);
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { discordId?: string } | undefined;

    if (!session || !isAdmin(user?.discordId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rows = await sql`
      SELECT id, user_id, discord_username, role, answers, status, created_at
      FROM applications
      ORDER BY created_at DESC
      LIMIT 200;
    `;

    return NextResponse.json({ ok: true, applications: rows });
  } catch (err: any) {
    console.error("[/api/admin/applications] error", err);
    return NextResponse.json({ error: "Failed to load applications" }, { status: 500 });
  }
}
