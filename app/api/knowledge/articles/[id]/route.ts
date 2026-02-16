import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { sql } from "@vercel/postgres";
import { authOptions } from "@/lib/auth";
import {
  ensureKnowledgeTable,
  isAdminSession,
  createUniqueSlug,
  getSessionAdminId,
} from "@/lib/knowledge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureKnowledgeTable();

    const { id } = await params;
    const isAdmin = isAdminSession(session);

    const article = await sql`
      SELECT id, slug, title, category, summary, content, published, created_by, updated_by, created_at, updated_at
      FROM knowledge_articles
      WHERE (id::text = ${id} OR slug = ${id})
        AND (${isAdmin} = true OR published = true)
      LIMIT 1
    `;

    if (!article.rows.length) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    return NextResponse.json({ article: article.rows[0], canEdit: isAdmin });
  } catch (err: unknown) {
    console.error("[knowledge/article] GET error:", toErrorMessage(err));
    return NextResponse.json({ error: "Failed to load article" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminSession(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureKnowledgeTable();

    const { id } = await params;
    const body = await req.json();

    const title = String(body?.title || "").trim();
    const category = String(body?.category || "general").trim().toLowerCase();
    const summary = String(body?.summary || "").trim();
    const content = String(body?.content || "").trim();
    const published = Boolean(body?.published);

    if (!title || !content) {
      return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
    }

    const slug = await createUniqueSlug(String(body?.slug || title), id);
    const actor = getSessionAdminId(session);

    const updated = await sql`
      UPDATE knowledge_articles
      SET slug = ${slug},
          title = ${title},
          category = ${category || "general"},
          summary = ${summary || null},
          content = ${content},
          published = ${published},
          updated_by = ${actor},
          updated_at = NOW()
      WHERE id::text = ${id} OR slug = ${id}
      RETURNING id, slug, title, category, summary, content, published, created_by, updated_by, created_at, updated_at
    `;

    if (!updated.rows.length) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, article: updated.rows[0] });
  } catch (err: unknown) {
    console.error("[knowledge/article] PUT error:", toErrorMessage(err));
    return NextResponse.json({ error: "Failed to update article" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminSession(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureKnowledgeTable();

    const { id } = await params;

    const deleted = await sql`
      DELETE FROM knowledge_articles
      WHERE id::text = ${id} OR slug = ${id}
      RETURNING id
    `;

    if (!deleted.rows.length) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, id: deleted.rows[0].id });
  } catch (err: unknown) {
    console.error("[knowledge/article] DELETE error:", toErrorMessage(err));
    return NextResponse.json({ error: "Failed to delete article" }, { status: 500 });
  }
}
