import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql } from "@vercel/postgres";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;

  if (!session || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Simple admin check
  if (userId !== "yourdiscordid") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const applications = await sql`
    SELECT * FROM applications
    ORDER BY created_at DESC;
  `;

  return NextResponse.json(applications);
}
