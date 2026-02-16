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

    // Security check against your admin list
    if (!session || !ADMIN_IDS.includes(adminId)) {
      return NextResponse.json({ error: 'Unauthorized Access' }, { status: 401 });
    }

    const body = await req.json();
    const { applicationId, status } = body; 

    if (!applicationId || !status) {
      return NextResponse.json({ error: 'Missing Data' }, { status: 400 });
    }

    // Determine final status and log the admin who did it
    const isReset = status === 'reset';
    const finalStatus = isReset ? 'pending' : status;
    const auditNote = isReset 
      ? `RESET by ${adminUser.name} on ${new Date().toLocaleDateString()}`
      : `${status.toUpperCase()} by ${adminUser.name} on ${new Date().toLocaleDateString()}`;

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

    return NextResponse.json({ ok: true, application: result.rows[0] });

  } catch (error: any) {
    console.error("Decision API Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}