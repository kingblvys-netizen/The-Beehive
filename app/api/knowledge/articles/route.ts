import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { sql } from "@vercel/postgres";
import { authOptions } from "@/lib/auth";
import {
  ensureKnowledgeTable,
  createUniqueSlug,
  getSessionAdminId,
} from "@/lib/knowledge";
import { getSessionAccessInfo } from "@/lib/access";
import { logAdminActivity } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

type AudienceFilter = "all" | "internal" | "public";

function normalizeAudience(input: string): AudienceFilter {
  const value = String(input || "").trim().toLowerCase();
  if (value === "internal" || value === "public") return value;
  return "all";
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const access = await getSessionAccessInfo(session);

    await ensureKnowledgeTable();

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const category = (searchParams.get("category") || "").trim().toLowerCase();
    const audience = normalizeAudience(searchParams.get("audience") || "all");
    const canEdit = access.canAccessAdmin;

    const canReadInternal = access.canAccessKnowledge;
    const canReadPublic = true;

    const list = await sql`
      SELECT id, slug, title, category, audience, summary, content, published, created_by, updated_by, created_at, updated_at
      FROM knowledge_articles
      WHERE (
        (${canEdit} = true)
        OR (
          published = true
          AND (
            (audience = 'public' AND ${canReadPublic} = true)
            OR (audience = 'internal' AND ${canReadInternal} = true)
          )
        )
      )
        AND (${audience} = 'all' OR audience = ${audience})
        AND (${category} = '' OR LOWER(category) = ${category})
        AND (
          ${q} = ''
          OR title ILIKE ${`%${q}%`}
          OR COALESCE(summary, '') ILIKE ${`%${q}%`}
          OR content ILIKE ${`%${q}%`}
        )
      ORDER BY updated_at DESC
    `;

    return NextResponse.json({
      articles: list.rows,
      canEdit,
      canReadInternal,
      audience,
    });
  } catch (err: unknown) {
    console.error("[knowledge/articles] GET error:", toErrorMessage(err));
    return NextResponse.json({ error: "Failed to load content" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const access = await getSessionAccessInfo(session);
    if (!session || !access.canManageKnowledge) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureKnowledgeTable();

    const body = await req.json();
    const title = String(body?.title || "").trim();
    const category = String(body?.category || "general").trim().toLowerCase();
    const audience = normalizeAudience(String(body?.audience || "internal")) === "public" ? "public" : "internal";
    const summary = String(body?.summary || "").trim();
    const content = String(body?.content || "").trim();
    const published = Boolean(body?.published);

    if (!title || !content) {
      return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
    }

    const slug = await createUniqueSlug(String(body?.slug || title));
    const actor = getSessionAdminId(session);

    const created = await sql`
      INSERT INTO knowledge_articles (slug, title, category, audience, summary, content, published, created_by, updated_by)
      VALUES (${slug}, ${title}, ${category || "general"}, ${audience}, ${summary || null}, ${content}, ${published}, ${actor}, ${actor})
      RETURNING id, slug, title, category, audience, summary, content, published, created_by, updated_by, created_at, updated_at
    `;

    await logAdminActivity({
      actorId: access.discordId,
      actorName: session.user?.name,
      actorRole: access.role,
      area: "knowledge",
      action: "create-article",
      target: String(created.rows[0]?.id || ""),
      metadata: { slug, title, published, audience },
    });

    return NextResponse.json({ ok: true, article: created.rows[0] }, { status: 201 });
  } catch (err: unknown) {
    console.error("[knowledge/articles] POST error:", toErrorMessage(err));
    return NextResponse.json({ error: "Failed to create content" }, { status: 500 });
  }
}
