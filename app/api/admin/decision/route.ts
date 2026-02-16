import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getServerSession } from "next-auth";

// --- CONFIGURATION ---
const ADMIN_IDS = [
  "1208908529411301387", // King B
  "1406555930769756161", // Admin 2
  "1241945084346372247"  // Admin 3
];

export async function POST(req: Request) {
  try {
    // 1. SECURITY: Verify Admin Identity
    const session = await getServerSession();
    const adminUser = session?.user as any;
    const adminId = adminUser?.id || adminUser?.discordId;

    if (!session || !ADMIN_IDS.includes(adminId)) {
      console.warn(`[Security Risk] Unauthorized decision attempt by ID: ${adminId}`);
      return NextResponse.json({ error: 'Unauthorized Access' }, { status: 401 });
    }

    // 2. INPUT VALIDATION: Handle different variable names
    const body = await req.json();
    const applicationId = body.applicationId || body.id;
    // The frontend might send "status" or "decision", we accept both.
    const newStatus = body.status || body.decision; 

    if (!applicationId || !newStatus) {
      return NextResponse.json({ error: 'Missing Application ID or Status' }, { status: 400 });
    }

    // 3. DATABASE UPDATE
    const result = await sql`
      UPDATE applications 
      SET status = ${newStatus} 
      WHERE id = ${applicationId}
      RETURNING *;
    `;

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const updatedApp = result.rows[0];

    // 4. (OPTIONAL) DISCORD LOGGING
    // If you add a DISCORD_WEBHOOK_URL to your .env file, this will log actions!
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (webhookUrl) {
      const color = newStatus === 'approved' ? 0x22C55E : 0xEF4444; // Green or Red
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: `Candidate ${newStatus === 'approved' ? 'ACCEPTED' : 'DECLINED'}`,
            description: `**Admin:** ${adminUser.name}\n**Candidate:** ${updatedApp.username}\n**Role:** ${updatedApp.role_title}`,
            color: color,
            timestamp: new Date().toISOString()
          }]
        })
      }).catch(err => console.error("Webhook failed", err));
    }

    return NextResponse.json({ ok: true, application: updatedApp });

  } catch (error: any) {
    console.error("[Decision API Error]:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}