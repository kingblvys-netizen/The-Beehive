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
  displayName?: string;
  role?: "manager" | "staff";
};

type DeleteBody = {
  discordId?: string;
};

function isLikelyDiscordSnowflake(input: string) {
  return /^\d{15,22}$/.test(input);
}

async function resolveDiscordDisplayName(discordId: string) {
  const token = String(process.env.DISCORD_BOT_TOKEN || "").trim();
  if (!token || !isLikelyDiscordSnowflake(discordId)) return null;

  try {
    const res = await fetch(`https://discord.com/api/v10/users/${discordId}`, {
      headers: {
        Authorization: `Bot ${token}`,
      },
      cache: "no-store",
    });

    if (!res.ok) return null;
    const data = (await res.json().catch(() => ({}))) as { global_name?: string | null; username?: string | null };
    const name = String(data?.global_name || data?.username || "").trim();
    return name || null;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const access = await getSessionAccessInfo(session);

    if (!session || !access.canManageAccessControl) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const entries = await listAccessControlEntries();

    const unresolvedIds = Array.from(
      new Set(
        entries
          .filter((entry) => !String(entry.display_name || "").trim())
          .map((entry) => String(entry.discord_id || "").trim())
          .filter(Boolean)
      )
    );

    const resolvedPairs = await Promise.all(
      unresolvedIds.map(async (discordId) => {
        const displayName = await resolveDiscordDisplayName(discordId);
        return [discordId, displayName] as const;
      })
    );

    const resolvedMap = new Map<string, string>();
    for (const [discordId, displayName] of resolvedPairs) {
      if (displayName) resolvedMap.set(discordId, displayName);
    }

    const hydrated = entries.map((entry) => ({
      ...entry,
      display_name: String(entry.display_name || "").trim() || resolvedMap.get(entry.discord_id) || null,
    }));

    return NextResponse.json({ entries: hydrated });
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
    const displayName = String(body.displayName || "").trim();
    const role = body.role;

    if (!discordId || (role !== "manager" && role !== "staff")) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    if (!isLikelyDiscordSnowflake(discordId)) {
      return NextResponse.json({ error: "Invalid Discord ID format" }, { status: 400 });
    }

    const entry = await upsertAccessRole({
      discordId,
      displayName,
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
      metadata: { role, displayName: displayName || null },
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
