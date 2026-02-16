import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { sql } from "@vercel/postgres";
import { authOptions } from "@/lib/auth";
import { getSessionAccessInfo } from "@/lib/access";
import { logAdminActivity } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const access = await getSessionAccessInfo(session);

    if (!session || !access.canAccessAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const result = await sql`
      SELECT id, discord_id, username, role_id, role_title, status, audit_note, created_at, answers
      FROM applications
      WHERE id = ${id}
      LIMIT 1
    `;

    if (!result.rows.length) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ application: result.rows[0] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[admin/applications/get] error:", message);
    return NextResponse.json({ error: "Load failed" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const access = await getSessionAccessInfo(session);

    if (!session || !access.canAccessAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const result = await sql`
      DELETE FROM applications
      WHERE id = ${id}
      RETURNING id
    `;

    if (!result.rows.length) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await logAdminActivity({
      actorId: access.discordId,
      actorName: session.user?.name,
      actorRole: access.role,
      area: "applications",
      action: "delete",
      target: String(id),
    });

    return NextResponse.json({ ok: true, id: result.rows[0].id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[admin/applications/delete] error:", message);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}