import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { sql } from "@vercel/postgres";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SessionUser = {
  id?: string;
  discordId?: string;
};

function sanitizeAnswersPayload(raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {} as Record<string, unknown>;

  const source = raw as Record<string, unknown>;
  const blocked = new Set([
    "discord_user",
    "discord_id",
    "discord_username",
    "discordid",
    "username",
    "user_id",
    "userid",
    "email",
  ]);

  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    if (!key) continue;
    const normalized = key.toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (blocked.has(normalized)) continue;
    cleaned[key] = value;
  }
  return cleaned;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    const discordId = String(user?.discordId || user?.id || "").trim();
    if (!discordId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { roleId, roleTitle, answers } = await req.json();
    if (!roleId || !roleTitle || !answers || typeof answers !== "object") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const safeAnswers = sanitizeAnswersPayload(answers);

    const existing = await sql`
      SELECT id, status
      FROM applications
      WHERE discord_id = ${discordId}
        AND (role_id = ${String(roleId)} OR role_title = ${String(roleTitle)})
        AND status <> 'reset'
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (existing.rows.length > 0) {
      return NextResponse.json(
        {
          error: "You already submitted an application for this role. Wait for admin reset.",
          existing: existing.rows[0],
        },
        { status: 409 }
      );
    }

    const result = await sql`
      INSERT INTO applications (discord_id, username, role_id, role_title, answers, status)
      VALUES (${discordId}, ${""}, ${String(roleId)}, ${String(roleTitle)}, ${JSON.stringify(safeAnswers)}, 'pending')
      RETURNING id
    `;

    return NextResponse.json({ ok: true, id: result.rows[0]?.id }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Submit failed";
    console.error("[apply] submit failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    const discordId = String(user?.discordId || user?.id || "").trim();
    if (!discordId) {
      return NextResponse.json({ applied: false, appliedRoles: [] });
    }

    const { searchParams } = new URL(req.url);
    const roleId = searchParams.get("roleId");

    // Backward-compatible single-role check
    if (roleId) {
      const existing = await sql`
        SELECT id, status
        FROM applications
        WHERE discord_id = ${discordId}
          AND role_id = ${String(roleId)}
          AND status <> 'reset'
        ORDER BY created_at DESC
        LIMIT 1
      `;

      return NextResponse.json({
        applied: existing.rows.length > 0,
        existing: existing.rows[0] ?? null,
      });
    }

    // Homepage lock map (latest non-reset entry per role)
    const submitted = await sql`
      SELECT DISTINCT ON (role_id)
        role_id,
        role_title,
        status,
        id,
        created_at
      FROM applications
      WHERE discord_id = ${discordId}
        AND role_id IS NOT NULL
        AND status <> 'reset'
      ORDER BY role_id, created_at DESC
    `;

    return NextResponse.json({
      applied: submitted.rows.length > 0,
      appliedRoles: submitted.rows,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Check failed";
    console.error("[apply] check failed:", message);
    return NextResponse.json({ applied: false, appliedRoles: [] }, { status: 500 });
  }
}