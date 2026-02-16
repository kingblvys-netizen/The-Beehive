import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql } from "@/lib/db";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;

  if (!session || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { answers } = body;

  if (!answers) {
    return NextResponse.json({ error: "Missing answers" }, { status: 400 });
  }

  const result = await sql`
    INSERT INTO applications (user_id, answers)
    VALUES (${userId}, ${JSON.stringify(answers)})
    RETURNING *;
  `;

  return NextResponse.json(result[0]);
}
