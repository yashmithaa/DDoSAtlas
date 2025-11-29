import { NextResponse } from "next/server";
import { getEvents, addFakeEvents } from "@/lib/store";

export async function GET() {
  addFakeEvents();
  
  const events = getEvents();
  
  return NextResponse.json(events);
}
