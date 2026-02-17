import { sql } from "@vercel/postgres";
import type { Session } from "next-auth";
import { ADMIN_IDS } from "@/lib/config";

export type AccessRole = "manager" | "staff";

export type AccessInfo = {
  discordId: string;
  role: AccessRole | null;
  source: "bootstrap" | "db" | "none";
  canOpenAdminPanel: boolean;
  canAccessAdmin: boolean;
  canAccessKnowledge: boolean;
  canManageKnowledge: boolean;
  canViewLogs: boolean;
  canManageAccessControl: boolean;
};

type AccessRow = {
  discord_id: string;
  display_name: string | null;
  role: AccessRole;
  added_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

type ApplicationNameRow = {
  discord_id: string;
  username: string | null;
};

type AuditNameRow = {
  actor_id: string;
  actor_name: string | null;
};

function normalizeDiscordId(input: unknown) {
  return String(input || "").trim();
}

export function getSessionDiscordId(session: Session | null) {
  const user = session?.user as { id?: string; discordId?: string } | undefined;
  return normalizeDiscordId(user?.discordId || user?.id || "");
}

export async function ensureAccessControlTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS access_control (
      discord_id TEXT PRIMARY KEY,
      display_name TEXT,
      role TEXT NOT NULL CHECK (role IN ('manager', 'staff')),
      added_by TEXT,
      updated_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_access_control_role
      ON access_control(role);
  `;

  await sql`
    ALTER TABLE access_control
    ADD COLUMN IF NOT EXISTS display_name TEXT;
  `;
}

export async function getAccessRoleByDiscordId(discordId: string): Promise<AccessRole | null> {
  const normalized = normalizeDiscordId(discordId);
  if (!normalized) return null;

  if (ADMIN_IDS.includes(normalized)) {
    return "manager";
  }

  await ensureAccessControlTable();

  const result = await sql<Pick<AccessRow, "role">>`
    SELECT role
    FROM access_control
    WHERE discord_id = ${normalized}
    LIMIT 1
  `;

  const role = String(result.rows[0]?.role || "") as AccessRole | "";
  return role === "manager" || role === "staff" ? role : null;
}

export async function getSessionAccessInfo(session: Session | null): Promise<AccessInfo> {
  const discordId = getSessionDiscordId(session);
  if (!discordId) {
    return {
      discordId: "",
      role: null,
      source: "none",
      canOpenAdminPanel: false,
      canAccessAdmin: false,
      canAccessKnowledge: false,
      canManageKnowledge: false,
      canViewLogs: false,
      canManageAccessControl: false,
    };
  }

  if (ADMIN_IDS.includes(discordId)) {
    return {
      discordId,
      role: "manager",
      source: "bootstrap",
      canOpenAdminPanel: true,
      canAccessAdmin: true,
      canAccessKnowledge: true,
      canManageKnowledge: true,
      canViewLogs: true,
      canManageAccessControl: true,
    };
  }

  const role = await getAccessRoleByDiscordId(discordId);
  if (!role) {
    return {
      discordId,
      role: null,
      source: "none",
      canOpenAdminPanel: false,
      canAccessAdmin: false,
      canAccessKnowledge: false,
      canManageKnowledge: false,
      canViewLogs: false,
      canManageAccessControl: false,
    };
  }

  return {
    discordId,
    role,
    source: "db",
    canOpenAdminPanel: role === "manager" || role === "staff",
    canAccessAdmin: role === "manager",
    canAccessKnowledge: role === "manager" || role === "staff",
    canManageKnowledge: role === "manager",
    canViewLogs: role === "manager",
    canManageAccessControl: role === "manager",
  };
}

export async function upsertAccessRole(input: { discordId: string; displayName?: string; role: AccessRole; actorId?: string }) {
  const discordId = normalizeDiscordId(input.discordId);
  if (!discordId) throw new Error("discordId is required");

  await ensureAccessControlTable();

  const actor = normalizeDiscordId(input.actorId || "");
  const displayName = String(input.displayName || "").trim();
  const result = await sql<AccessRow>`
    INSERT INTO access_control (discord_id, display_name, role, added_by, updated_by)
    VALUES (${discordId}, ${displayName || null}, ${input.role}, ${actor || null}, ${actor || null})
    ON CONFLICT (discord_id)
    DO UPDATE SET
      display_name = EXCLUDED.display_name,
      role = EXCLUDED.role,
      updated_by = EXCLUDED.updated_by,
      updated_at = NOW()
    RETURNING discord_id, display_name, role, added_by, updated_by, created_at, updated_at
  `;

  return result.rows[0];
}

export async function removeAccessRole(discordId: string) {
  const normalized = normalizeDiscordId(discordId);
  if (!normalized) return false;

  await ensureAccessControlTable();

  const result = await sql`
    DELETE FROM access_control
    WHERE discord_id = ${normalized}
    RETURNING discord_id
  `;

  return Boolean(result.rowCount);
}

export async function listAccessControlEntries() {
  await ensureAccessControlTable();
  const result = await sql<AccessRow>`
    SELECT discord_id, display_name, role, added_by, updated_by, created_at, updated_at
    FROM access_control
    ORDER BY updated_at DESC
  `;

  const knownNames = new Map<string, string>();

  try {
    const appNames = await sql<ApplicationNameRow>`
      SELECT DISTINCT ON (discord_id)
        discord_id,
        username
      FROM applications
      WHERE discord_id IS NOT NULL
        AND COALESCE(username, '') <> ''
      ORDER BY discord_id, created_at DESC
    `;

    for (const row of appNames.rows) {
      const id = String(row.discord_id || "").trim();
      const name = String(row.username || "").trim();
      if (id && name) knownNames.set(id, name);
    }
  } catch {
    // applications table may not exist in very early setup
  }

  try {
    const auditNames = await sql<AuditNameRow>`
      SELECT DISTINCT ON (actor_id)
        actor_id,
        actor_name
      FROM admin_activity_logs
      WHERE actor_id IS NOT NULL
        AND COALESCE(actor_name, '') <> ''
      ORDER BY actor_id, created_at DESC
    `;

    for (const row of auditNames.rows) {
      const id = String(row.actor_id || "").trim();
      const name = String(row.actor_name || "").trim();
      if (id && name && !knownNames.has(id)) knownNames.set(id, name);
    }
  } catch {
    // audit table may not exist in very early setup
  }

  const merged = new Map<string, { discord_id: string; display_name: string | null; role: AccessRole; source: "bootstrap" | "db"; added_by: string | null; updated_by: string | null; created_at: string | null; updated_at: string | null }>();

  for (const id of ADMIN_IDS) {
    merged.set(id, {
      discord_id: id,
      display_name: knownNames.get(id) || null,
      role: "manager",
      source: "bootstrap",
      added_by: null,
      updated_by: null,
      created_at: null,
      updated_at: null,
    });
  }

  for (const row of result.rows) {
    if (!merged.has(row.discord_id) || row.role === "manager") {
      merged.set(row.discord_id, {
        discord_id: row.discord_id,
        display_name: row.display_name || knownNames.get(row.discord_id) || null,
        role: row.role,
        source: "db",
        added_by: row.added_by,
        updated_by: row.updated_by,
        created_at: row.created_at,
        updated_at: row.updated_at,
      });
    }
  }

  return Array.from(merged.values()).sort((a, b) => {
    if (a.role !== b.role) return a.role === "manager" ? -1 : 1;
    return a.discord_id.localeCompare(b.discord_id);
  });
}
