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

  const adminId = process.env.ADMIN_DISCORD_ID;
  if (!adminId || userId !== adminId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const applications = await sql`
    SELECT * FROM applications
    ORDER BY created_at DESC;
  `;

  return NextResponse.json(applications.rows);
}

export async function POST(request: Request) {
  const payload = await request.json();

  const res = await fetch("/api/applications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Submit failed (${res.status}): ${text}`);
  }
}
