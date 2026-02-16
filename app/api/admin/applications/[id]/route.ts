import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { sql } from "@vercel/postgres";
import { authOptions } from "@/lib/auth";

const ADMIN_IDS = [
  "1208908529411301387",
  "1406555930769756161",
  "1241945084346372247",
  "845669772926779392",
  "417331086369226752",
];

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    const adminId = user?.id || user?.discordId;

    if (!session || !ADMIN_IDS.includes(String(adminId))) {
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

    return NextResponse.json({ ok: true, id: result.rows[0].id });
  } catch (err: any) {
    console.error("[admin/applications/delete] error:", err?.message || err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}