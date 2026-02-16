import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql } from "@/lib/db";

export async function GET() {
  return NextResponse.json({ ok: true, route: "/api/apply" });
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as
      | { id?: string; discordId?: string; name?: string; email?: string }
      | undefined;

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized: no session" }, { status: 401 });
    }

    const userId = user?.discordId || user?.id || user?.email || user?.name;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized: no user id" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);

    // Accept both:
    // 1) { role, answers }
    // 2) direct answers object
    const role =
      typeof body?.role === "string" && body.role.trim().length > 0
        ? body.role.trim()
        : "general";

    const answers =
      body?.answers && typeof body.answers === "object"
        ? body.answers
        : body && typeof body === "object"
        ? body
        : null;

    if (!answers) {
      return NextResponse.json(
        { error: "Missing answers payload" },
        { status: 400 }
      );
    }

    const rows = await sql`
      INSERT INTO applications (user_id, discord_username, role, answers, status)
      VALUES (${String(userId)}, ${user?.name ?? null}, ${role}, ${sql.json(answers)}, 'pending')
      RETURNING id, user_id, discord_username, role, status, created_at;
    `;

    return NextResponse.json({ ok: true, application: rows[0] }, { status: 201 });
  } catch (err: any) {
    console.error("[/api/apply] error", {
      message: err?.message,
      code: err?.code,
      detail: err?.detail,
    });

    return NextResponse.json(
      { error: err?.message ?? "Failed to submit application" },
      { status: 500 }
    );
  }
}

console.log("SELECT to_regclass('public.applications');");
console.log((await sql`SELECT to_regclass('public.applications');`).toString());
