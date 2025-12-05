import { NextResponse } from "next/server";
import { ensureFreshData } from "@/lib/store";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const events = await ensureFreshData();
    
    return NextResponse.json(events);
  } catch (error) {
    console.error('Error in /api/events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch threat data' },
      { status: 500 }
    );
  }
}
