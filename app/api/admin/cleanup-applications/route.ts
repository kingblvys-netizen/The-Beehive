import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { sql } from "@vercel/postgres";
import { authOptions } from "@/lib/auth";
import { ADMIN_IDS, APPLICATION_RETENTION_DAYS } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CleanupRequest = {
  dryRun?: boolean;
  days?: number;
  includeDeclined?: boolean;
  includeReset?: boolean;
};

function isAdminDiscordId(input: string) {
  return ADMIN_IDS.includes(String(input || ""));
}

function toErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

function isCronAuthorized(req: Request) {
  const expected = process.env.CLEANUP_CRON_SECRET;
  if (!expected) return false;

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";
  return token && token === expected;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id?: string; discordId?: string } | undefined;
    const adminId = String(user?.id || user?.discordId || "");

    const isSessionAdmin = !!session && isAdminDiscordId(adminId);
    const isCron = isCronAuthorized(req);

    if (!isSessionAdmin && !isCron) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as CleanupRequest;
    const days = Number.isFinite(body.days) && Number(body.days) > 0
      ? Math.max(7, Math.min(3650, Math.floor(Number(body.days))))
      : APPLICATION_RETENTION_DAYS;

    const includeDeclined = body.includeDeclined !== false;
    const includeReset = body.includeReset !== false;
    const dryRun = Boolean(body.dryRun);

    if (!includeDeclined && !includeReset) {
      return NextResponse.json({ error: "No statuses selected for cleanup" }, { status: 400 });
    }

    const shouldDecline = includeDeclined;
    const shouldReset = includeReset;

    if (dryRun) {
      const preview = await sql`
        SELECT COUNT(*)::int AS count
        FROM applications
        WHERE created_at < NOW() - (${days}::int * INTERVAL '1 day')
          AND (
            (status = 'declined' AND ${shouldDecline} = true)
            OR
            (status = 'reset' AND ${shouldReset} = true)
          )
      `;

      return NextResponse.json({
        ok: true,
        dryRun: true,
        days,
        includeDeclined,
        includeReset,
        willDelete: preview.rows[0]?.count ?? 0,
      });
    }

    const deleted = await sql`
      DELETE FROM applications
      WHERE created_at < NOW() - (${days}::int * INTERVAL '1 day')
        AND (
          (status = 'declined' AND ${shouldDecline} = true)
          OR
          (status = 'reset' AND ${shouldReset} = true)
        )
      RETURNING id
    `;

    return NextResponse.json({
      ok: true,
      dryRun: false,
      days,
      includeDeclined,
      includeReset,
      deletedCount: deleted.rowCount ?? 0,
    });
  } catch (err: unknown) {
    console.error("[cleanup-applications] error:", toErrorMessage(err));
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
