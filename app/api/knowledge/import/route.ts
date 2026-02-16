import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { sql } from "@vercel/postgres";
import { authOptions } from "@/lib/auth";
import {
  createUniqueSlug,
  ensureKnowledgeTable,
  getSessionAdminId,
  isAdminSession,
} from "@/lib/knowledge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BulkSection = {
  title: string;
  category: string;
  summary: string;
  content: string;
};

function toErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

function normalizeCategory(input: string, fallback: string) {
  const raw = (input || fallback || "general").toLowerCase().trim();
  return raw.replace(/[^a-z0-9-\s]/g, "").replace(/\s+/g, "-") || "general";
}

function makeSummary(content: string) {
  const clean = content.replace(/[#>*_`\[\]\-]/g, " ").replace(/\s+/g, " ").trim();
  return clean.slice(0, 180);
}

function parseBulkSections(rawText: string, defaultCategory: string): BulkSection[] {
  const normalized = rawText.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const delimited = normalized
    .split(/\n\s*---\s*\n/g)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  if (delimited.length > 1) {
    return delimited.map((chunk, index) => {
      const lines = chunk.split("\n");
      const firstLine = lines[0] || "";
      const headingMatch = firstLine.match(/^#{1,3}\s+(.+)$/);
      const title = (headingMatch?.[1] || firstLine || `Imported Article ${index + 1}`).trim();
      const body = headingMatch ? lines.slice(1).join("\n").trim() : lines.slice(1).join("\n").trim() || chunk;
      return {
        title,
        category: normalizeCategory(defaultCategory, "general"),
        summary: makeSummary(body),
        content: body || chunk,
      };
    });
  }

  const headingSplit = normalized.split(/\n(?=#{1,3}\s+)/g).map((chunk) => chunk.trim()).filter(Boolean);
  if (headingSplit.length > 1) {
    return headingSplit.map((chunk, index) => {
      const lines = chunk.split("\n");
      const first = lines[0] || "";
      const heading = first.match(/^#{1,3}\s+(.+)$/)?.[1]?.trim() || `Imported Article ${index + 1}`;
      const body = lines.slice(1).join("\n").trim();
      return {
        title: heading,
        category: normalizeCategory(defaultCategory, "general"),
        summary: makeSummary(body),
        content: body || chunk,
      };
    });
  }

  return [
    {
      title: "Imported Handbook",
      category: normalizeCategory(defaultCategory, "general"),
      summary: makeSummary(normalized),
      content: normalized,
    },
  ];
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminSession(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureKnowledgeTable();

    const body = await req.json();
    const rawText = String(body?.rawText || "").trim();
    const defaultCategory = String(body?.category || "general");
    const published = Boolean(body?.published);

    if (!rawText) {
      return NextResponse.json({ error: "No import content provided" }, { status: 400 });
    }

    const sections = parseBulkSections(rawText, defaultCategory).filter((item) => item.content.trim() && item.title.trim());

    if (sections.length === 0) {
      return NextResponse.json({ error: "No valid sections found" }, { status: 400 });
    }

    const actor = getSessionAdminId(session);
    const created: Array<{ id: number; slug: string; title: string; category: string }> = [];

    for (const section of sections) {
      const slug = await createUniqueSlug(section.title);
      const result = await sql`
        INSERT INTO knowledge_articles (slug, title, category, summary, content, published, created_by, updated_by)
        VALUES (${slug}, ${section.title}, ${section.category}, ${section.summary || null}, ${section.content}, ${published}, ${actor}, ${actor})
        RETURNING id, slug, title, category
      `;

      if (result.rows[0]) {
        created.push(result.rows[0] as { id: number; slug: string; title: string; category: string });
      }
    }

    return NextResponse.json({
      ok: true,
      importedCount: created.length,
      imported: created,
    });
  } catch (err: unknown) {
    console.error("[knowledge/import] POST error:", toErrorMessage(err));
    return NextResponse.json({ error: "Bulk import failed" }, { status: 500 });
  }
}
