/**
 * Mock Hive allowlist for szfin_realtime project table access.
 * Replace with Project Table Access List API in production.
 */
export const SZFIN_REALTIME_HIVE_TABLES: Record<string, string[]> = {
  feature_store: [
    "frame_order_events",
    "frame_risk_events_th",
    "dwd_wide_raw_feat_v1",
    "dwd_wide_clean_feat_v1",
    "user_profile_v3",
  ],
  risk_store: ["credit_behavior_v1", "frame_risk_events_th"],
  acard_mx: ["frame_acard_events"],
  szfin_realtime: ["project_access_demo", "allowed_events_v1"],
};

export function getSzfinRealtimeSchemaNames(): string[] {
  return Object.keys(SZFIN_REALTIME_HIVE_TABLES).sort((a, b) => a.localeCompare(b));
}

export function getSzfinRealtimeTablesForSchema(schema: string): string[] {
  const list = SZFIN_REALTIME_HIVE_TABLES[schema.trim()];
  return list ? [...list].sort((a, b) => a.localeCompare(b)) : [];
}
