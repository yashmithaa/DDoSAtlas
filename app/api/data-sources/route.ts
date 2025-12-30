import { NextResponse } from "next/server";
import { getActiveFeedConfigs } from "@/lib/feeds";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const feedConfigs = getActiveFeedConfigs();
    
    // Transform feed configs to data source format for frontend
    const dataSources = feedConfigs.map(config => ({
      id: config.id,
      name: config.name,
      description: config.description,
      url: getPublicUrl(config.id),
      status: config.status,
      type: config.type,
    }));
    
    return NextResponse.json(dataSources);
  } catch (error) {
    console.error('Error in /api/data-sources:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data sources' },
      { status: 500 }
    );
  }
}

// Map feed IDs to their public documentation/info URLs
function getPublicUrl(feedId: string): string {
  const urlMap: Record<string, string> = {
    'firehol-l1': 'https://iplists.firehol.org/',
    'firehol-l2': 'https://iplists.firehol.org/',
    'spamhaus-drop': 'https://www.spamhaus.org/drop/',
    'spamhaus-edrop': 'https://www.spamhaus.org/drop/',
    'abusech-feodo': 'https://feodotracker.abuse.ch/',
    'abusech-sslbl': 'https://sslbl.abuse.ch/',
    'blocklist-de': 'https://www.blocklist.de/',
    'cinsscore': 'https://cinsscore.com/',
    'emerging-threats': 'https://rules.emergingthreats.net/',
    'bruteforceblocker': 'https://danger.rulez.sk/index.php/bruteforceblocker/',
  };
  
  return urlMap[feedId] || '#';
}
