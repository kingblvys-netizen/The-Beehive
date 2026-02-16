import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSessionAccessInfo } from "@/lib/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

type AllowedStatus = "pending" | "approved" | "declined" | "reset";

async function ensureApplicationQueryIndexes() {
  await sql`
    CREATE INDEX IF NOT EXISTS idx_applications_status_created_at
    ON applications(status, created_at DESC)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_applications_created_at
    ON applications(created_at DESC)
  `;
}

function normalizeStatus(input: string): AllowedStatus | "all" {
  const value = String(input || "").trim().toLowerCase();
  if (value === "pending" || value === "approved" || value === "declined" || value === "reset") {
    return value;
  }
  return "all";
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const access = await getSessionAccessInfo(session);

    if (!session || !access.canOpenAdminPanel) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureApplicationQueryIndexes();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Math.floor(Number(searchParams.get("page") || 1)));
    const pageSize = Math.max(10, Math.min(100, Math.floor(Number(searchParams.get("pageSize") || 25))));
    const status = normalizeStatus(searchParams.get("status") || "all");
    const q = String(searchParams.get("q") || "").trim();
    const qLike = q ? `%${q}%` : "";

    const countResult = await sql`
      SELECT COUNT(*)::int AS total
      FROM applications
      WHERE (${status} = 'all' OR status = ${status})
        AND (
          ${q} = ''
          OR username ILIKE ${qLike}
          OR discord_id ILIKE ${qLike}
          OR role_title ILIKE ${qLike}
          OR COALESCE(audit_note, '') ILIKE ${qLike}
        )
    `;

    const total = Number(countResult.rows[0]?.total || 0);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const safeOffset = (safePage - 1) * pageSize;

    const { rows } = await sql`
      SELECT id, discord_id, username, role_id, role_title, status, audit_note, created_at
      FROM applications
      WHERE (${status} = 'all' OR status = ${status})
        AND (
          ${q} = ''
          OR username ILIKE ${qLike}
          OR discord_id ILIKE ${qLike}
          OR role_title ILIKE ${qLike}
          OR COALESCE(audit_note, '') ILIKE ${qLike}
        )
      ORDER BY created_at DESC
      LIMIT ${pageSize}
      OFFSET ${safeOffset}
    `;

    return NextResponse.json({
      applications: rows,
      pagination: {
        page: safePage,
        pageSize,
        total,
        totalPages,
        hasPrev: safePage > 1,
        hasNext: safePage < totalPages,
      },
      filters: {
        status,
        q,
      },
    });
  } catch (err: unknown) {
    console.error("[admin/applications] DB error:", toErrorMessage(err));
    return NextResponse.json({ message: "Database connection failed" }, { status: 500 });
  }
}