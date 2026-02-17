import { sql } from "@vercel/postgres";
import type { Session } from "next-auth";
import { ADMIN_IDS } from "@/lib/config";

const bootstrapAdminIds = new Set<string>(ADMIN_IDS);

export type KnowledgeArticle = {
  id: number;
  slug: string;
  title: string;
  category: string;
  audience: "internal" | "public";
  summary: string | null;
  content: string;
  published: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export async function ensureKnowledgeTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS knowledge_articles (
      id BIGSERIAL PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'general',
      audience TEXT NOT NULL DEFAULT 'internal' CHECK (audience IN ('internal', 'public')),
      summary TEXT,
      content TEXT NOT NULL,
      published BOOLEAN NOT NULL DEFAULT false,
      created_by TEXT,
      updated_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_knowledge_articles_updated_at
      ON knowledge_articles(updated_at DESC);
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_knowledge_articles_category
      ON knowledge_articles(category);
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_knowledge_articles_audience_published
      ON knowledge_articles(audience, published, updated_at DESC);
  `;

  await sql`
    ALTER TABLE knowledge_articles
    ADD COLUMN IF NOT EXISTS audience TEXT NOT NULL DEFAULT 'internal';
  `;

  await sql`
    ALTER TABLE knowledge_articles
    DROP CONSTRAINT IF EXISTS knowledge_articles_audience_check;
  `;

  await sql`
    ALTER TABLE knowledge_articles
    ADD CONSTRAINT knowledge_articles_audience_check
    CHECK (audience IN ('internal', 'public'));
  `;
}

export function getSessionAdminId(session: Session | null) {
  const user = session?.user as { id?: string; discordId?: string } | undefined;
  return String(user?.discordId || user?.id || "");
}

export function isAdminSession(session: Session | null) {
  return bootstrapAdminIds.has(getSessionAdminId(session));
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export async function createUniqueSlug(base: string, skipId?: string) {
  const normalized = slugify(base || "article");
  const seed = normalized || "article";
  let attempt = seed;
  let n = 1;

  while (true) {
    const exists = await sql`
      SELECT id
      FROM knowledge_articles
      WHERE slug = ${attempt}
      LIMIT 1
    `;

    if (exists.rowCount === 0) return attempt;
    if (skipId && String(exists.rows[0]?.id) === String(skipId)) return attempt;
    n += 1;
    attempt = `${seed}-${n}`;
  }
}