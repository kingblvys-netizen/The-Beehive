import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("BODY RECEIVED:", body);

    await sql`SELECT 1`;

    return NextResponse.json({ message: "DB works" });
  } catch (error) {
    console.error("ERROR:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
