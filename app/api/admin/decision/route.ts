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

    // 2. INPUT VALIDATION
    const body = await req.json();
    const applicationId = body.applicationId || body.id;
    const rawStatus = body.status || body.decision; 

    if (!applicationId || !rawStatus) {
      return NextResponse.json({ error: 'Missing Data' }, { status: 400 });
    }

    // 3. TACTICAL LOGIC: Handle Reset vs Decision
    const isReset = rawStatus === 'reset';
    const finalStatus = isReset ? 'pending' : rawStatus;
    
    // Create the Audit Note for the Admin Panel
    const auditNote = isReset 
      ? `RESET by ${adminUser.name} on ${new Date().toLocaleDateString()}`
      : `${rawStatus.toUpperCase()} by ${adminUser.name} on ${new Date().toLocaleDateString()}`;

    // 4. DATABASE UPDATE: Syncing Status and Audit Note
    const result = await sql`
      UPDATE applications 
      SET status = ${finalStatus}, 
          audit_note = ${auditNote} 
      WHERE id = ${applicationId}
      RETURNING *;
    `;

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const updatedApp = result.rows[0];

    // 5. DISCORD INTELLIGENCE: Automated Notification
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (webhookUrl) {
      const statusColors: Record<string, number> = {
        approved: 0x22C55E, // Green
        declined: 0xEF4444, // Red
        reset: 0xFACC15    // Yellow
      };

      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: isReset ? `🔄 Protocol Reset` : `📡 Candidate ${rawStatus.toUpperCase()}`,
            description: `**Admin:** ${adminUser.name}\n**Candidate:** ${updatedApp.username}\n**Target Role:** ${updatedApp.role_title}\n**Log:** ${auditNote}`,
            color: statusColors[rawStatus] || 0x000000,
            timestamp: new Date().toISOString(),
            footer: { text: `Hive ID: #${updatedApp.id}` }
          }]
        })
      }).catch(err => console.error("Discord Webhook failed:", err));
    }

    return NextResponse.json({ ok: true, application: updatedApp });

  } catch (error: any) {
    console.error("[Decision API Error]:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}