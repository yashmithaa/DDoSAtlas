export interface RawEntry {
  ip: string;
  source: string;
  reason: string;
}

const FEED_URLS: {
  firehol_level1?: string;
  firehol_level2?: string;
  spamhaus_drop?: string;
  spamhaus_edrop?: string;
  abuse_ch_feodo?: string;
} = {
  firehol_level1: process.env.FEED_FIREHOL_L1,
  firehol_level2: process.env.FEED_FIREHOL_L2,
  spamhaus_drop: process.env.FEED_SPAMHAUS_DROP,
  spamhaus_edrop: process.env.FEED_SPAMHAUS_EDROP,
  abuse_ch_feodo: process.env.FEED_ABUSECH_FEODO,
};


async function fetchFireHOL(url: string, source: string): Promise<RawEntry[]> {
  try {
    const response = await fetch(url, { 
      next: { revalidate: 1800 } // Cache for 30 mins
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch ${source}: ${response.status}`);
      return [];
    }

    const text = await response.text();
    const entries: RawEntry[] = [];

    const lines = text.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      // Extract IP (may be CIDR notation, we'll take just IP for simplicity)
      const ipMatch = trimmed.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
      if (ipMatch) {
        entries.push({
          ip: ipMatch[1],
          source,
          reason: 'botnet/malware/scanner'
        });
      }
    }

    return entries;
  } catch (error) {
    console.error(`Error fetching ${source}:`, error);
    return [];
  }
}

/**
 * Fetch and parse Spamhaus DROP lists
 */
async function fetchSpamhaus(url: string, source: string): Promise<RawEntry[]> {
  try {
    const response = await fetch(url, {
      next: { revalidate: 1800 }
    });

    if (!response.ok) {
      console.error(`Failed to fetch ${source}: ${response.status}`);
      return [];
    }

    const text = await response.text();
    const entries: RawEntry[] = [];

    const lines = text.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith(';')) continue;
      
      // Extract IP from CIDR notation
      const ipMatch = trimmed.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
      if (ipMatch) {
        entries.push({
          ip: ipMatch[1],
          source,
          reason: 'spam/malicious hosting'
        });
      }
    }

    return entries;
  } catch (error) {
    console.error(`Error fetching ${source}:`, error);
    return [];
  }
}

/**
 * Fetch and parse Abuse.ch Feodo Tracker (C2 IPs)
 */
async function fetchAbuseCh(url: string, source: string): Promise<RawEntry[]> {
  try {
    const response = await fetch(url, {
      next: { revalidate: 1800 }
    });

    if (!response.ok) {
      console.error(`Failed to fetch ${source}: ${response.status}`);
      return [];
    }

    const text = await response.text();
    const entries: RawEntry[] = [];

    const lines = text.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      // Extract IP
      const ipMatch = trimmed.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
      if (ipMatch) {
        entries.push({
          ip: ipMatch[1],
          source,
          reason: 'C2/botnet'
        });
      }
    }

    return entries;
  } catch (error) {
    console.error(`Error fetching ${source}:`, error);
    return [];
  }
}

/**
 * Fetch all threat feeds and combine results
 */
export async function fetchThreatFeeds(): Promise<RawEntry[]> {
  console.log('Fetching threat feeds...');

  const tasks: Promise<RawEntry[]>[] = [];

  if (FEED_URLS.firehol_level1) {
    tasks.push(fetchFireHOL(FEED_URLS.firehol_level1, 'FireHOL-L1'));
  } else {
    console.warn('FEED_FIREHOL_L1 not set — skipping FireHOL L1 feed');
  }

  if (FEED_URLS.firehol_level2) {
    tasks.push(fetchFireHOL(FEED_URLS.firehol_level2, 'FireHOL-L2'));
  } else {
    console.warn('FEED_FIREHOL_L2 not set — skipping FireHOL L2 feed');
  }

  if (FEED_URLS.spamhaus_drop) {
    tasks.push(fetchSpamhaus(FEED_URLS.spamhaus_drop, 'Spamhaus-DROP'));
  } else {
    console.warn('FEED_SPAMHAUS_DROP not set — skipping Spamhaus DROP feed');
  }

  if (FEED_URLS.spamhaus_edrop) {
    tasks.push(fetchSpamhaus(FEED_URLS.spamhaus_edrop, 'Spamhaus-eDROP'));
  } else {
    console.warn('FEED_SPAMHAUS_EDROP not set — skipping Spamhaus eDROP feed');
  }

  if (FEED_URLS.abuse_ch_feodo) {
    tasks.push(fetchAbuseCh(FEED_URLS.abuse_ch_feodo, 'Abuse.ch-Feodo'));
  } else {
    console.warn('FEED_ABUSECH_FEODO not set — skipping Abuse.ch Feodo feed');
  }

  if (tasks.length === 0) {
    console.warn('No feed URLs configured (no FEED_* env vars found)');
    return [];
  }

  const results = await Promise.allSettled(tasks);

  const allEntries: RawEntry[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allEntries.push(...result.value);
    }
  }

  console.log(`Fetched ${allEntries.length} total entries from threat feeds`);
  return allEntries;
}
