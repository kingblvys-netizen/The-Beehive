import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getServerSession } from "next-auth";
import { ADMIN_IDS } from '@/lib/config';

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    const adminUser = session?.user as any;
    const adminId = adminUser?.id || adminUser?.discordId;

    // Security Gate
    if (!session || !ADMIN_IDS.includes(adminId)) {
      return NextResponse.json({ error: 'Unauthorized Access' }, { status: 401 });
    }

    const body = await req.json();
    const applicationId = body.applicationId;
    const rawStatus = body.status; 

    if (!applicationId || !rawStatus) {
      return NextResponse.json({ error: 'Missing Data' }, { status: 400 });
    }

    // Logic for Second Chance Reset
    const isReset = rawStatus === 'reset';
    const finalStatus = isReset ? 'pending' : rawStatus;
    
    const auditNote = isReset 
      ? `RESET by ${adminUser.name} on ${new Date().toLocaleDateString()}`
      : `${rawStatus.toUpperCase()} by ${adminUser.name} on ${new Date().toLocaleDateString()}`;

    // Database Update
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
    console.error("Decision Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}