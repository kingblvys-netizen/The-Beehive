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

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await getSessionAccessInfo(session);
    if (!access.canAccessKnowledge) {
      return NextResponse.json({ error: "Knowledge access required" }, { status: 403 });
    }

    await ensureKnowledgeTable();

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const category = (searchParams.get("category") || "").trim().toLowerCase();
    const canEdit = access.canAccessAdmin;

    const list = await sql`
      SELECT id, slug, title, category, summary, content, published, created_by, updated_by, created_at, updated_at
      FROM knowledge_articles
      WHERE (${canEdit} = true OR published = true)
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
    });
  } catch (err: unknown) {
    console.error("[knowledge/articles] GET error:", toErrorMessage(err));
    return NextResponse.json({ error: "Failed to load knowledge base" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const access = await getSessionAccessInfo(session);
    if (!session || !access.canAccessAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureKnowledgeTable();

    const body = await req.json();
    const title = String(body?.title || "").trim();
    const category = String(body?.category || "general").trim().toLowerCase();
    const summary = String(body?.summary || "").trim();
    const content = String(body?.content || "").trim();
    const published = Boolean(body?.published);

    if (!title || !content) {
      return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
    }

    const slug = await createUniqueSlug(String(body?.slug || title));
    const actor = getSessionAdminId(session);

    const created = await sql`
      INSERT INTO knowledge_articles (slug, title, category, summary, content, published, created_by, updated_by)
      VALUES (${slug}, ${title}, ${category || "general"}, ${summary || null}, ${content}, ${published}, ${actor}, ${actor})
      RETURNING id, slug, title, category, summary, content, published, created_by, updated_by, created_at, updated_at
    `;

    await logAdminActivity({
      actorId: access.discordId,
      actorName: session.user?.name,
      actorRole: access.role,
      area: "knowledge",
      action: "create-article",
      target: String(created.rows[0]?.id || ""),
      metadata: { slug, title, published },
    });

    return NextResponse.json({ ok: true, article: created.rows[0] }, { status: 201 });
  } catch (err: unknown) {
    console.error("[knowledge/articles] POST error:", toErrorMessage(err));
    return NextResponse.json({ error: "Failed to create article" }, { status: 500 });
  }
}
