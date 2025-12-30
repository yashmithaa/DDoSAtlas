// Application constants

export const REFRESH_INTERVAL = 5000; // 5 seconds

export const SCORE_THRESHOLDS = {
  HIGH: 70,
  MEDIUM: 40,
} as const;

export const NAV_ITEMS = [
  { href: "/", label: "MAP" },
  { href: "/statistics", label: "STATISTICS" },
  { href: "/data-sources", label: "DATA SOURCES" },
] as const;

export const DISPLAY_LIMITS = {
  RECENT_EVENTS: 10,
  TOP_COUNTRIES: 5,
  SIDEBAR_EVENTS: 5,
} as const;
