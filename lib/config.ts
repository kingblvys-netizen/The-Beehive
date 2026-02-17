export const SYN_DISCORD_ID = "1208908529411301387";

export const ADMIN_IDS = [
  SYN_DISCORD_ID, // Syn
  "1406555930769756161", 
  "1241945084346372247",
  "845669772926779392",  // New Admin 4
  "417331086369226752"   // New Admin 5
];

export const SENIOR_ADMIN_IDS = [SYN_DISCORD_ID];

// --- SYSTEM CONTROLS ---
export const MAINTENANCE_MODE = false; // Set to true to activate lockdown
export const RATE_LIMIT_COOLDOWN = 24 * 60 * 60 * 1000; // 24 Hours
export const APPLICATION_RETENTION_DAYS = 180; // Auto-clean old non-active applications

// --- METADATA ---
export const SITE_VERSION = "2.1.0-TACTICAL";
export const CORE_SATELLITE = "HIVE-ORBITAL-1";