import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ADMIN_IDS } from '@/lib/config';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const adminUser = session?.user as any;
    const adminId = adminUser?.id || adminUser?.discordId;

    // --- SECURITY GATE ---
    if (!session || !ADMIN_IDS.includes(adminId)) {
      return NextResponse.json({ error: 'Unauthorized: Admin Clearance Required' }, { status: 401 });
    }

    const body = await req.json();
    const { applicationId, status } = body; 

    if (!applicationId || !status) {
      return NextResponse.json({ error: 'Missing Protocol Data' }, { status: 400 });
    }

    // --- 1. PURGE PROTOCOL (Allows Re-application) ---
    // If status is 'purge', we delete the entry so the user can apply again.
    if (status === 'purge') {
      const deleteResult = await sql`
        DELETE FROM applications 
        WHERE id = ${applicationId}
        RETURNING id;
      `;

      if (deleteResult.rowCount === 0) {
        return NextResponse.json({ error: 'Record not found in core' }, { status: 404 });
      }

      return NextResponse.json({ 
        ok: true, 
        message: 'Record successfully purged. Candidate may re-apply.' 
      });
    }

    // --- 2. RESET/DECISION PROTOCOL ---
    // 'reset' sets status back to 'pending'. Others (approved/declined) update as requested.
    const isReset = status === 'reset';
    const finalStatus = isReset ? 'reset' : status;
    
    // Generate a timestamped audit log for the dashboard
    const auditNote = isReset
      ? `RESET/UNLOCK by ${adminUser.name} on ${new Date().toLocaleDateString()}`
      : `${status.toUpperCase()} by ${adminUser.name} on ${new Date().toLocaleDateString()}`;

    const updateResult = await sql`
      UPDATE applications 
      SET status = ${finalStatus}, 
          audit_note = ${auditNote} 
      WHERE id = ${applicationId}
      RETURNING *;
    `;

    if (updateResult.rowCount === 0) {
      return NextResponse.json({ error: 'Identity matching failed' }, { status: 404 });
    }

    return NextResponse.json({ 
      ok: true, 
      application: updateResult.rows[0] 
    });

  } catch (error: any) {
    console.error("Decision API Critical Failure:", error);
    return NextResponse.json({ error: 'Internal Core Error' }, { status: 500 });
  }
}