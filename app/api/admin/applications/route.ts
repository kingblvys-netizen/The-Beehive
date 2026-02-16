import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// Force dynamic ensures we always get the latest DB state, not a cached version
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    
    // 1. Identification: Retrieve the unique Discord identifier from the session
    const userId = user?.id || user?.discordId || user?.sub;

    if (!session || !userId) {
      return NextResponse.json({ message: 'Unauthorized Access' }, { status: 401 });
    }

    // 2. Synchronization Query: Fetch all application statuses for this specific user
    // This allows the homepage to accurately display 'Under Review' or unlock the button
    const { rows } = await sql`
      SELECT
        a.id,
        a.username,
        a.discord_id,
        a.role_id,
        a.role_title,
        a.status,
        a.created_at,
        COALESCE(
          jsonb_object_agg(ans.question_id, ans.answer) FILTER (WHERE ans.question_id IS NOT NULL),
          '{}'::jsonb
        ) AS answers
      FROM applications a
      LEFT JOIN application_answers ans ON ans.application_id = a.id
      GROUP BY a.id
      ORDER BY a.created_at DESC
    `;

    console.log("admin/apps answers sample:", rows[0]?.answers);
    return NextResponse.json(rows, { status: 200 });

  } catch (error) {
    console.error('Core Sync Failure:', error);
    return NextResponse.json({ message: 'Database Satellite Uplink Failed' }, { status: 500 });
  }
}

const coerceAnswers = (raw: unknown): Record<string, unknown> => {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
};

// Example: ensure answers is selected from DB
// Prisma example:
// const apps = await prisma.application.findMany({
//   orderBy: { createdAt: "desc" },
//   select: {
//     id: true,
//     username: true,
//     discord_id: true,
//     role_id: true,
//     role_title: true,
//     status: true,
//     answers: true, // <-- REQUIRED
//     createdAt: true,
//   },
// });

// ...existing code...
// Removed invalid top-level return; response code must live inside an exported route handler.
// ...existing code...