import { NextResponse } from "next/server";
import { ensureFreshData, getSummary } from "@/lib/store";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    await ensureFreshData();
    
    // Get summary from cached data (now async with Redis support)
    const summary = await getSummary();
    
    return NextResponse.json(summary);
  } catch (error) {
    console.error('Error in /api/summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch summary data' },
      { status: 500 }
    );
  }
}
