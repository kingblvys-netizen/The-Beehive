export const SYN_DISCORD_ID = "1208908529411301387" as const;

export const SENIOR_ADMIN_IDS = [
  SYN_DISCORD_ID, // Syn
  "1241945084346372247", // Zach
] as const;

export const HONORARY_MANAGER = {
  id: "1406555930769756161",
  title: "Pupbee",
} as const;

export const MANAGER_IDS = [
  "845669772926779392",  // Manager 4
  "417331086369226752"   // Manager 5
] as const;

export const ADMIN_IDS = [
  ...SENIOR_ADMIN_IDS,
  HONORARY_MANAGER.id,
  ...MANAGER_IDS,
] as const;

// --- SYSTEM CONTROLS ---
export const MAINTENANCE_MODE = false; // Set to true to activate lockdown
export const RATE_LIMIT_COOLDOWN = 24 * 60 * 60 * 1000; // 24 Hours
export const APPLICATION_RETENTION_DAYS = 180; // Auto-clean old non-active applications

// --- METADATA ---
export const SITE_VERSION = "2.1.0-TACTICAL";
export const CORE_SATELLITE = "HIVE-ORBITAL-1";