import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { sql } from "@vercel/postgres";
import { authOptions } from "@/lib/auth";
import { APPLICATION_RETENTION_DAYS } from "@/lib/config";
import { getSessionAccessInfo } from "@/lib/access";
import { logAdminActivity } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CleanupRequest = {
  dryRun?: boolean;
  days?: number;
  includeDeclined?: boolean;
  includeReset?: boolean;
};

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
    const access = await getSessionAccessInfo(session);

    const isSessionAdmin = !!session && access.canAccessAdmin;
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

      if (isSessionAdmin && session) {
        await logAdminActivity({
          actorId: access.discordId,
          actorName: session.user?.name,
          actorRole: access.role,
          area: "cleanup",
          action: "dry-run",
          metadata: { days, includeDeclined, includeReset, willDelete: preview.rows[0]?.count ?? 0 },
        });
      }

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

    if (isSessionAdmin && session) {
      await logAdminActivity({
        actorId: access.discordId,
        actorName: session.user?.name,
        actorRole: access.role,
        area: "cleanup",
        action: "execute",
        metadata: { days, includeDeclined, includeReset, deletedCount: deleted.rowCount ?? 0 },
      });
    }

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
