export interface RawEntry {
  ip: string;
  source: string;
  reason: string;
}

export interface FeedConfig {
  id: string;
  name: string;
  description: string;
  url: string;
  envVar: string;
  type: 'threat-intel' | 'blocklist' | 'honeypot';
  parser: 'firehol' | 'spamhaus' | 'abusech' | 'abusech-csv' | 'blocklist-de' | 'cinsscore' | 'emergingthreats';
  reason: string;
}

// All supported feed configurations - URLs come from environment variables
export const FEED_CONFIGS: FeedConfig[] = [
  {
    id: 'firehol-l1',
    name: 'FireHOL Level 1',
    description: 'High-confidence malicious IPs from multiple verified sources. Includes known attackers, botnet C&Cs, and spam sources.',
    url: process.env.FEED_FIREHOL_L1 || '',
    envVar: 'FEED_FIREHOL_L1',
    type: 'blocklist',
    parser: 'firehol',
    reason: 'botnet/malware/scanner'
  },
  {
    id: 'firehol-l2',
    name: 'FireHOL Level 2',
    description: 'Medium-confidence threat IPs including bruteforce attackers, known exploiters, and malware distributors.',
    url: process.env.FEED_FIREHOL_L2 || '',
    envVar: 'FEED_FIREHOL_L2',
    type: 'blocklist',
    parser: 'firehol',
    reason: 'bruteforce/exploit'
  },
  {
    id: 'spamhaus-drop',
    name: 'Spamhaus DROP',
    description: 'Do Not Route Or Peer list - IP ranges hijacked by spammers and cyber criminals.',
    url: process.env.FEED_SPAMHAUS_DROP || '',
    envVar: 'FEED_SPAMHAUS_DROP',
    type: 'blocklist',
    parser: 'spamhaus',
    reason: 'spam/hijacked'
  },
  {
    id: 'spamhaus-edrop',
    name: 'Spamhaus eDROP',
    description: 'Extended DROP list - additional netblocks used by professional spam and cybercrime operations.',
    url: process.env.FEED_SPAMHAUS_EDROP || '',
    envVar: 'FEED_SPAMHAUS_EDROP',
    type: 'blocklist',
    parser: 'spamhaus',
    reason: 'spam/cybercrime'
  },
  {
    id: 'abusech-feodo',
    name: 'Abuse.ch Feodo Tracker',
    description: 'Botnet C2 tracker - tracking Dridex, Emotet, TrickBot, and QakBot banking trojans.',
    url: process.env.FEED_ABUSECH_FEODO || '',
    envVar: 'FEED_ABUSECH_FEODO',
    type: 'threat-intel',
    parser: 'abusech',
    reason: 'C2/botnet'
  },
  {
    id: 'abusech-sslbl',
    name: 'Abuse.ch SSL Blacklist',
    description: 'Database of malicious SSL certificates used by botnet C&C servers.',
    url: process.env.FEED_ABUSECH_SSLBL || '',
    envVar: 'FEED_ABUSECH_SSLBL',
    type: 'threat-intel',
    parser: 'abusech-csv',
    reason: 'C2/malicious-ssl'
  },
  {
    id: 'blocklist-de',
    name: 'Blocklist.de',
    description: 'Free blocklist service - IPs reported for SSH, mail, web attacks collected from honeypots.',
    url: process.env.FEED_BLOCKLIST_DE || '',
    envVar: 'FEED_BLOCKLIST_DE',
    type: 'honeypot',
    parser: 'blocklist-de',
    reason: 'ssh-attack/web-attack'
  },
  {
    id: 'cinsscore',
    name: 'CI Army Bad IPs',
    description: 'Collective Intelligence Network Security - IPs with poor reputation scores from global sensors.',
    url: process.env.FEED_CINSSCORE || '',
    envVar: 'FEED_CINSSCORE',
    type: 'threat-intel',
    parser: 'cinsscore',
    reason: 'bad-reputation/scanner'
  },
  {
    id: 'emerging-threats',
    name: 'Emerging Threats Compromised',
    description: 'Proofpoint Emerging Threats - known compromised hosts currently participating in attacks.',
    url: process.env.FEED_EMERGING_THREATS || '',
    envVar: 'FEED_EMERGING_THREATS',
    type: 'threat-intel',
    parser: 'emergingthreats',
    reason: 'compromised/attacking'
  },
  {
    id: 'bruteforceblocker',
    name: 'BruteForceBlocker',
    description: 'IPs caught attempting SSH bruteforce attacks.',
    url: process.env.FEED_BRUTEFORCE || '',
    envVar: 'FEED_BRUTEFORCE',
    type: 'honeypot',
    parser: 'firehol',
    reason: 'ssh-bruteforce'
  },
];


async function fetchFireHOL(config: FeedConfig): Promise<RawEntry[]> {
  try {
    const response = await fetch(config.url, { 
      next: { revalidate: 1800 } // Cache for 30 mins
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch ${config.name}: ${response.status}`);
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
          source: config.name,
          reason: config.reason
        });
      }
    }

    return entries;
  } catch (error) {
    console.error(`Error fetching ${config.name}:`, error);
    return [];
  }
}

/**
 * Fetch and parse Spamhaus DROP lists
 */
async function fetchSpamhaus(config: FeedConfig): Promise<RawEntry[]> {
  try {
    const response = await fetch(config.url, {
      next: { revalidate: 1800 }
    });

    if (!response.ok) {
      console.error(`Failed to fetch ${config.name}: ${response.status}`);
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
          source: config.name,
          reason: config.reason
        });
      }
    }

    return entries;
  } catch (error) {
    console.error(`Error fetching ${config.name}:`, error);
    return [];
  }
}

/**
 * Fetch and parse Abuse.ch Feodo Tracker (C2 IPs)
 */
async function fetchAbuseCh(config: FeedConfig): Promise<RawEntry[]> {
  try {
    const response = await fetch(config.url, {
      next: { revalidate: 1800 }
    });

    if (!response.ok) {
      console.error(`Failed to fetch ${config.name}: ${response.status}`);
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
          source: config.name,
          reason: config.reason
        });
      }
    }

    return entries;
  } catch (error) {
    console.error(`Error fetching ${config.name}:`, error);
    return [];
  }
}

/**
 * Fetch and parse Abuse.ch CSV format (SSL Blacklist)
 */
async function fetchAbuseChCSV(config: FeedConfig): Promise<RawEntry[]> {
  try {
    const response = await fetch(config.url, {
      next: { revalidate: 1800 }
    });

    if (!response.ok) {
      console.error(`Failed to fetch ${config.name}: ${response.status}`);
      return [];
    }

    const text = await response.text();
    const entries: RawEntry[] = [];

    const lines = text.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      // CSV format: timestamp,sha1,reason,dst_ip,dst_port
      const parts = trimmed.split(',');
      if (parts.length >= 4) {
        const ip = parts[3]?.trim();
        const ipMatch = ip?.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
        if (ipMatch) {
          entries.push({
            ip: ipMatch[1],
            source: config.name,
            reason: config.reason
          });
        }
      }
    }

    return entries;
  } catch (error) {
    console.error(`Error fetching ${config.name}:`, error);
    return [];
  }
}

/**
 * Fetch and parse Blocklist.de format
 */
async function fetchBlocklistDE(config: FeedConfig): Promise<RawEntry[]> {
  try {
    const response = await fetch(config.url, {
      next: { revalidate: 1800 }
    });

    if (!response.ok) {
      console.error(`Failed to fetch ${config.name}: ${response.status}`);
      return [];
    }

    const text = await response.text();
    const entries: RawEntry[] = [];

    const lines = text.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip empty lines (blocklist.de is just IPs, one per line)
      if (!trimmed) continue;
      
      const ipMatch = trimmed.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
      if (ipMatch) {
        entries.push({
          ip: ipMatch[1],
          source: config.name,
          reason: config.reason
        });
      }
    }

    return entries;
  } catch (error) {
    console.error(`Error fetching ${config.name}:`, error);
    return [];
  }
}

/**
 * Fetch and parse CI Army / CINS Score format
 */
async function fetchCINSScore(config: FeedConfig): Promise<RawEntry[]> {
  try {
    const response = await fetch(config.url, {
      next: { revalidate: 1800 }
    });

    if (!response.ok) {
      console.error(`Failed to fetch ${config.name}: ${response.status}`);
      return [];
    }

    const text = await response.text();
    const entries: RawEntry[] = [];

    const lines = text.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      const ipMatch = trimmed.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
      if (ipMatch) {
        entries.push({
          ip: ipMatch[1],
          source: config.name,
          reason: config.reason
        });
      }
    }

    return entries;
  } catch (error) {
    console.error(`Error fetching ${config.name}:`, error);
    return [];
  }
}

/**
 * Fetch and parse Emerging Threats format
 */
async function fetchEmergingThreats(config: FeedConfig): Promise<RawEntry[]> {
  try {
    const response = await fetch(config.url, {
      next: { revalidate: 1800 }
    });

    if (!response.ok) {
      console.error(`Failed to fetch ${config.name}: ${response.status}`);
      return [];
    }

    const text = await response.text();
    const entries: RawEntry[] = [];

    const lines = text.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      const ipMatch = trimmed.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
      if (ipMatch) {
        entries.push({
          ip: ipMatch[1],
          source: config.name,
          reason: config.reason
        });
      }
    }

    return entries;
  } catch (error) {
    console.error(`Error fetching ${config.name}:`, error);
    return [];
  }
}

/**
 * Get the appropriate parser function for a feed config
 */
function getParser(config: FeedConfig): ((config: FeedConfig) => Promise<RawEntry[]>) | null {
  switch (config.parser) {
    case 'firehol':
      return fetchFireHOL;
    case 'spamhaus':
      return fetchSpamhaus;
    case 'abusech':
      return fetchAbuseCh;
    case 'abusech-csv':
      return fetchAbuseChCSV;
    case 'blocklist-de':
      return fetchBlocklistDE;
    case 'cinsscore':
      return fetchCINSScore;
    case 'emergingthreats':
      return fetchEmergingThreats;
    default:
      return null;
  }
}

/**
 * Fetch all threat feeds and combine results
 */
export async function fetchThreatFeeds(): Promise<RawEntry[]> {
  console.log('Fetching threat feeds...');

  const tasks: Promise<RawEntry[]>[] = [];
  const activeFeeds: string[] = [];

  for (const config of FEED_CONFIGS) {
    if (!config.url) {
      console.warn(`${config.envVar} not set — skipping ${config.name} feed`);
      continue;
    }

    const parser = getParser(config);
    if (!parser) {
      console.warn(`No parser found for ${config.name} — skipping`);
      continue;
    }

    tasks.push(parser(config));
    activeFeeds.push(config.name);
  }

  if (tasks.length === 0) {
    console.warn('No feed URLs configured (no FEED_* env vars found)');
    return [];
  }

  console.log(`Fetching from ${tasks.length} feeds: ${activeFeeds.join(', ')}`);

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

/**
 * Get the status of all configured feeds
 */
export function getActiveFeedConfigs(): Array<FeedConfig & { status: 'active' | 'inactive' }> {
  return FEED_CONFIGS.map(config => ({
    ...config,
    status: config.url ? 'active' as const : 'inactive' as const
  }));
}
