import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSessionAccessInfo } from "@/lib/access";
import { logAdminActivity } from "@/lib/audit";

type ToggleRoleBody = {
  roleId?: string;
  isOpen?: boolean;
};

type RoleSettingRow = {
  role_id: string;
  is_open: boolean | null;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const access = await getSessionAccessInfo(session);

    if (!session || !access.canAccessAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { roleId, isOpen } = (await req.json().catch(() => ({}))) as ToggleRoleBody;
    if (!roleId || typeof isOpen !== "boolean") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    await sql`
      INSERT INTO role_settings (role_id, is_open)
      VALUES (${roleId}, ${isOpen})
      ON CONFLICT (role_id)
      DO UPDATE SET is_open = EXCLUDED.is_open;
    `;

    await logAdminActivity({
      actorId: access.discordId,
      actorName: session.user?.name,
      actorRole: access.role,
      area: "recruitment-roles",
      action: isOpen ? "open-role" : "lock-role",
      target: roleId,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[toggle-role] POST error:", error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { rows } = await sql<RoleSettingRow>`SELECT role_id, is_open FROM role_settings`;
    const settings = Object.fromEntries(rows.map((r) => [r.role_id, Boolean(r.is_open)]));
    return NextResponse.json({ settings, rows });
  } catch (error) {
    console.error("[toggle-role] GET error:", error);
    return NextResponse.json({ settings: {}, rows: [] });
  }
}