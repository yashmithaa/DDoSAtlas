import { NextResponse } from "next/server";
import { getSummary, addFakeEvents } from "@/lib/store";

export async function GET() {
  addFakeEvents();
  
  const summary = getSummary();
  
  return NextResponse.json(summary);
}
