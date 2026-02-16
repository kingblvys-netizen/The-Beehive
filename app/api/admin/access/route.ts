import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getSessionAccessInfo,
  listAccessControlEntries,
  removeAccessRole,
  upsertAccessRole,
} from "@/lib/access";
import { logAdminActivity } from "@/lib/audit";
import { ADMIN_IDS } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type UpsertBody = {
  discordId?: string;
  role?: "manager" | "staff";
};

type DeleteBody = {
  discordId?: string;
};

function isLikelyDiscordSnowflake(input: string) {
  return /^\d{15,22}$/.test(input);
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const access = await getSessionAccessInfo(session);

    if (!session || !access.canManageAccessControl) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const entries = await listAccessControlEntries();
    return NextResponse.json({ entries });
  } catch (error) {
    console.error("[admin/access] GET error:", error);
    return NextResponse.json({ error: "Failed to load access list" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const access = await getSessionAccessInfo(session);

    if (!session || !access.canManageAccessControl) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as UpsertBody;
    const discordId = String(body.discordId || "").trim();
    const role = body.role;

    if (!discordId || (role !== "manager" && role !== "staff")) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    if (!isLikelyDiscordSnowflake(discordId)) {
      return NextResponse.json({ error: "Invalid Discord ID format" }, { status: 400 });
    }

    const entry = await upsertAccessRole({
      discordId,
      role,
      actorId: access.discordId,
    });

    await logAdminActivity({
      actorId: access.discordId,
      actorName: session.user?.name,
      actorRole: access.role,
      area: "access-control",
      action: "upsert-role",
      target: discordId,
      metadata: { role },
    });

    return NextResponse.json({ ok: true, entry });
  } catch (error) {
    console.error("[admin/access] POST error:", error);
    return NextResponse.json({ error: "Failed to update access" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const access = await getSessionAccessInfo(session);

    if (!session || !access.canManageAccessControl) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as DeleteBody;
    const discordId = String(body.discordId || "").trim();

    if (!discordId) {
      return NextResponse.json({ error: "discordId is required" }, { status: 400 });
    }

    if (ADMIN_IDS.includes(discordId)) {
      return NextResponse.json({ error: "Cannot remove bootstrap manager" }, { status: 400 });
    }

    const removed = await removeAccessRole(discordId);

    await logAdminActivity({
      actorId: access.discordId,
      actorName: session.user?.name,
      actorRole: access.role,
      area: "access-control",
      action: "remove-role",
      target: discordId,
      metadata: { removed },
    });

    if (!removed) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, discordId });
  } catch (error) {
    console.error("[admin/access] DELETE error:", error);
    return NextResponse.json({ error: "Failed to remove access" }, { status: 500 });
  }
}
