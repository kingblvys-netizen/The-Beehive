import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSessionAccessInfo } from "@/lib/access";
import { listAdminActivity } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const access = await getSessionAccessInfo(session);

    if (!session || !access.canAccessAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") || 100);
    const area = searchParams.get("area") || "";
    const actorId = searchParams.get("actorId") || "";
    const action = searchParams.get("action") || "";
    const target = searchParams.get("target") || "";
    const query = searchParams.get("q") || "";

    const logs = await listAdminActivity({
      limit,
      area,
      actorId,
      action,
      target,
      query,
    });
    return NextResponse.json({ logs });
  } catch (error) {
    console.error("[admin/logs] GET error:", error);
    return NextResponse.json({ error: "Failed to load logs" }, { status: 500 });
  }
}
