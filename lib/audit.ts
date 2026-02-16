import { sql } from "@vercel/postgres";

export type AdminActivityInput = {
  actorId: string;
  actorName?: string | null;
  actorRole?: string | null;
  area: string;
  action: string;
  target?: string | null;
  metadata?: unknown;
};

type ActivityRow = {
  id: number;
  actor_id: string;
  actor_name: string | null;
  actor_role: string | null;
  area: string;
  action: string;
  target: string | null;
  metadata: unknown;
  created_at: string;
};

export type AdminActivityFilters = {
  limit?: number;
  area?: string;
  actorId?: string;
  action?: string;
  target?: string;
  query?: string;
};

export async function ensureAdminActivityTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS admin_activity_logs (
      id BIGSERIAL PRIMARY KEY,
      actor_id TEXT NOT NULL,
      actor_name TEXT,
      actor_role TEXT,
      area TEXT NOT NULL,
      action TEXT NOT NULL,
      target TEXT,
      metadata JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_created_at
      ON admin_activity_logs(created_at DESC);
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_actor_id
      ON admin_activity_logs(actor_id);
  `;
}

export async function logAdminActivity(input: AdminActivityInput) {
  const actorId = String(input.actorId || "").trim();
  const area = String(input.area || "").trim();
  const action = String(input.action || "").trim();

  if (!actorId || !area || !action) return;

  try {
    await ensureAdminActivityTable();
    await sql`
      INSERT INTO admin_activity_logs (actor_id, actor_name, actor_role, area, action, target, metadata)
      VALUES (
        ${actorId},
        ${input.actorName ? String(input.actorName) : null},
        ${input.actorRole ? String(input.actorRole) : null},
        ${area},
        ${action},
        ${input.target ? String(input.target) : null},
        ${input.metadata ? JSON.stringify(input.metadata) : null}
      )
    `;
  } catch (error) {
    console.error("[admin-audit] log failed:", error);
  }
}

export async function listAdminActivity(filters: AdminActivityFilters = {}) {
  await ensureAdminActivityTable();
  const safeLimit = Math.max(1, Math.min(500, Math.floor(Number(filters.limit) || 100)));
  const area = String(filters.area || "").trim();
  const actorId = String(filters.actorId || "").trim();
  const action = String(filters.action || "").trim();
  const target = String(filters.target || "").trim();
  const query = String(filters.query || "").trim();
  const queryLike = query ? `%${query}%` : "";

  const result = await sql<ActivityRow>`
    SELECT id, actor_id, actor_name, actor_role, area, action, target, metadata, created_at
    FROM admin_activity_logs
    WHERE (${area} = '' OR area = ${area})
      AND (${actorId} = '' OR actor_id = ${actorId})
      AND (${action} = '' OR action = ${action})
      AND (${target} = '' OR target = ${target})
      AND (
        ${query} = ''
        OR actor_id ILIKE ${queryLike}
        OR COALESCE(actor_name, '') ILIKE ${queryLike}
        OR area ILIKE ${queryLike}
        OR action ILIKE ${queryLike}
        OR COALESCE(target, '') ILIKE ${queryLike}
      )
    ORDER BY created_at DESC
    LIMIT ${safeLimit}
  `;

  return result.rows;
}
