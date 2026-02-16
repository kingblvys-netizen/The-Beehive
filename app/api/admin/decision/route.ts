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

  // optional admin gate
  if (userId !== "1208908529411301387") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { applicationId, decision } = body;

  if (!applicationId || !decision) {
    return NextResponse.json({ error: "Missing data" }, { status: 400 });
  }

  const result = await sql`
    UPDATE applications
    SET status = ${decision}
    WHERE id = ${applicationId}
    RETURNING *;
  `;

  return NextResponse.json(result[0]);
}
