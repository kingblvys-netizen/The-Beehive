import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Simple admin check
  if (session.user.id !== "yourdiscordid") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const applications = await sql`
    SELECT * FROM applications
    ORDER BY created_at DESC;
  `;

  return NextResponse.json(applications);
}
