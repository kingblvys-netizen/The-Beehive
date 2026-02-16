import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSessionAccessInfo } from "@/lib/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        {
          authenticated: false,
          role: null,
          canAccessAdmin: false,
          canAccessKnowledge: false,
          discordId: "",
        },
        { status: 200 }
      );
    }

    const info = await getSessionAccessInfo(session);
    return NextResponse.json({
      authenticated: true,
      discordId: info.discordId,
      role: info.role,
      source: info.source,
      canAccessAdmin: info.canAccessAdmin,
      canAccessKnowledge: info.canAccessKnowledge,
    });
  } catch (error) {
    console.error("[admin/access/me] error:", error);
    return NextResponse.json({ error: "Failed to resolve access" }, { status: 500 });
  }
}
