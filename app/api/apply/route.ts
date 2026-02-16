import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id?: string; discordId?: string } | undefined;
    const userId = user?.id ?? user?.discordId;

    if (!session || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { answers } = body ?? {};

    if (!answers || typeof answers !== "object") {
      return NextResponse.json({ error: "Missing or invalid answers" }, { status: 400 });
    }

    const result = await sql`
      INSERT INTO applications (user_id, answers)
      VALUES (${userId}, ${sql.json(answers)})
      RETURNING *;
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (err: any) {
    console.error("[/api/apply] error:", err);

    // Helpful DB diagnostics
    if (err?.code === "22P02") {
      return NextResponse.json(
        { error: "DB type mismatch (likely user_id column type)" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: err?.message ?? "Failed to submit application" },
      { status: 500 }
    );
  }
}

console.log("SELECT to_regclass('public.applications');");
console.log((await sql`SELECT to_regclass('public.applications');`).toString());
