import { NextResponse } from "next/server";
import { getRedisStats } from "@/lib/redis";

export const dynamic = 'force-dynamic';

/**
 * Debug endpoint to check Redis status.
 * Only available in development or with a secret key.
 */
export async function GET(request: Request) {
  // Optional: Protect this endpoint in production
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  
  if (process.env.NODE_ENV === 'production' && secret !== process.env.DEBUG_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const stats = await getRedisStats();
    
    return NextResponse.json({
      redis: stats,
      environment: {
        hasRedisUrl: !!process.env.UPSTASH_REDIS_REST_URL,
        hasRedisToken: !!process.env.UPSTASH_REDIS_REST_TOKEN,
        nodeEnv: process.env.NODE_ENV,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in /api/debug/redis:', error);
    return NextResponse.json(
      { error: 'Failed to get Redis stats', details: String(error) },
      { status: 500 }
    );
  }
}
