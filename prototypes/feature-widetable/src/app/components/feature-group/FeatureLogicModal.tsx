import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  GitBranch,
  X,
  Zap,
  Layers,
  Database,
  Sparkles,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  ShieldCheck,
  Code2,
  Activity,
  AlertTriangle,
  TrendingUp,
  Clock,
  FileText,
  Brain,
  Filter,
  ArrowUpDown,
  ChevronDown,
  Plus,
  Trash2,
  Bell,
  Gauge,
} from "lucide-react";

// ─── Health signal types ──────────────────────────────────────────────────────
interface HealthSignal {
  id: string;
  stage: string;
  stageType: "ods" | "dwd" | "ads" | "kafka" | "hbase" | "fg";
  path: "training" | "serving";
  signalType: "latency" | "drift" | "freshness" | "ok";
  severity: "critical" | "warning" | "ok";
  summary: string;
  detail: string;
  value: string;
  baseline: string;
  updatedAt: string;
}

// ─── Processing stage ─────────────────────────────────────────────────────────
interface ProcessingStage {
  id: string;
  order: number;
  taskName: string;
  stageLabel: string;
  inputAssets: string[];
  outputAsset: string;
  language: string;
  description: string;
  path: "training" | "serving";
  reviewStatus: "AI-KAG";
  snippet: string;
  dataverseUrl?: string;
}

// ─── Health monitoring rule ───────────────────────────────────────────────────
interface HealthRule {
  id: string;
  metric: "null_pct" | "fail_pct" | "drift";
  operator: ">=" | "<=" | "!=";
  threshold: string;
  receivers: string[];
  enabled: boolean;
}

const METRIC_OPTIONS: { value: HealthRule["metric"]; label: string }[] = [
  { value: "null_pct", label: "Null %" },
  { value: "fail_pct", label: "Fail %" },
  { value: "drift",    label: "Drifting" },
];

const OPERATOR_OPTIONS: { value: HealthRule["operator"]; label: string }[] = [
  { value: ">=", label: ">=" },
  { value: "<=", label: "<=" },
  { value: "!=", label: "!=" },
];

const MOCK_RECEIVERS = [
  "alice.wang@company.com",
  "bob.chen@company.com",
  "diana.xu@company.com",
  "zhengyi.loh@seamoney.com",
  "huangwei@shopee.com",
  "cedric.chencan@seamoney.com",
];

const SEVERITY_STYLE: Record<HealthSignal["severity"], { cls: string; icon: React.ReactNode }> = {
  ok:       { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="w-3 h-3" /> },
  warning:  { cls: "bg-amber-50 text-amber-700 border-amber-200",       icon: <TrendingUp  className="w-3 h-3" /> },
  critical: { cls: "bg-red-50 text-red-600 border-red-200",             icon: <AlertTriangle className="w-3 h-3" /> },
};

// ─── Mock data builders ───────────────────────────────────────────────────────
function buildMockFreshnessSignals(featureName: string): HealthSignal[] {
  const now = "2026-05-15 08:30";
  return [
    {
      id: "h-1", stage: "binlog.user_credit_events → ods.user_credit_events",
      stageType: "ods", path: "training", signalType: "ok", severity: "ok",
      summary: "ODS ingestion on track",
      detail: "ods.user_credit_events daily partition dt=2026-05-14 completed at 03:22 UTC. 98.3M rows loaded, no schema changes detected.",
      value: "2026-05-14 03:22", baseline: "daily before 04:00", updatedAt: now,
    },
    {
      id: "h-2", stage: "ods.user_credit_events → dwd.user_credit_30d_features",
      stageType: "dwd", path: "training", signalType: "latency", severity: "warning",
      summary: "DWD aggregation delayed by 1.5h",
      detail: "dwd.user_credit_30d_features dt=2026-05-14 completed at 05:48. Typical completion is 04:15 ± 30 min. Spark job queued longer than usual due to cluster contention.",
      value: "05:48 (+1.5h)", baseline: "~04:15", updatedAt: now,
    },
    {
      id: "h-4", stage: "kafka.credit_events → stream.credit_events_enriched",
      stageType: "kafka", path: "serving", signalType: "ok", severity: "ok",
      summary: "Kafka stream healthy",
      detail: "Topic credit_events: consumer lag 120ms, throughput 8.4K msg/s. No message loss or duplication detected in last 24h.",
      value: "lag 120ms", baseline: "< 500ms", updatedAt: now,
    },
    {
      id: "h-5", stage: "stream → hbase.user_risk:cf:risk_score_raw",
      stageType: "hbase", path: "serving", signalType: "freshness", severity: "ok",
      summary: "HBase write freshness OK",
      detail: "hbase.user_risk table: latest write at 08:29:45 UTC. 99.7% of writes within 2s of Kafka event time. No TTL eviction spikes.",
      value: "2s behind", baseline: "< 5s", updatedAt: now,
    },
    {
      id: "h-6", stage: `FG Serving Canvas → feature: ${featureName}`,
      stageType: "fg", path: "serving", signalType: "ok", severity: "ok",
      summary: "Feature serving latency normal",
      detail: `FG serving p99 = 182ms (HBase scan 96ms + Groovy transform 86ms). Call volume 12.3K/min. Zero errors in last hour.`,
      value: "p99 182ms", baseline: "< 500ms", updatedAt: now,
    },
  ];
}

function buildMockDriftSignals(featureName: string): HealthSignal[] {
  const now = "2026-05-15 08:30";
  return [
    {
      id: "h-3", stage: "dwd.user_credit_30d_features → risk_db.user_risk_score_ods",
      stageType: "ads", path: "training", signalType: "drift", severity: "warning",
      summary: "risk_score distribution shift detected",
      detail: `Column risk_score mean shifted from 612.3 (7d avg) to 688.7 (+12.5%). P95 increased from 921 to 952. Distribution is right-skewed; possible underlying event pattern change.`,
      value: "+12.5%", baseline: "7d avg 612.3", updatedAt: now,
    },
  ];
}

function buildMockHealthRules(): HealthRule[] {
  return [
    { id: "r-1", metric: "null_pct", operator: ">=", threshold: "5", receivers: ["alice.wang@company.com", "bob.chen@company.com"], enabled: true },
    { id: "r-2", metric: "fail_pct", operator: ">=", threshold: "1", receivers: ["alice.wang@company.com"], enabled: true },
    { id: "r-3", metric: "drift",    operator: "!=", threshold: "0.1", receivers: ["diana.xu@company.com", "cedric.chencan@seamoney.com"], enabled: false },
  ];
}


function buildMockProcessingStages(featureName: string): ProcessingStage[] {
  return [
    {
      id: "p-t-1", order: 1,
      taskName: "ods_user_credit_events",
      path: "training", stageLabel: "Raw Ingestion",
      inputAssets: ["binlog.user_credit_events"],
      outputAsset: "ods.user_credit_events",
      language: "SQL (Hive ETL)",
      description: "从上游 binlog 层全量导入用户信用事件原始数据，按 dt 分区落表。此阶段为 pass-through，不做任何业务加工，保留全部字段与事件时间戳。",
      reviewStatus: "AI-KAG",
      snippet: `-- Pass-through ingest: raw events that feed ${featureName}
SELECT user_id,
       event_type,
       amount,
       event_ts
FROM binlog.user_credit_events
WHERE dt = '\${dt}';`,
      dataverseUrl: "#",
    },
    {
      id: "p-t-2", order: 2,
      taskName: "dwd_user_credit_30d_agg",
      path: "training", stageLabel: "30-Day Aggregation",
      inputAssets: ["ods.user_credit_events"],
      outputAsset: "dwd.user_credit_30d_features",
      language: "SQL (Spark Batch)",
      description: "对近 30 天信用事件按用户维度聚合，计算逾期金额和还款次数两个中间特征，作为后续评分的输入因子。",
      reviewStatus: "AI-KAG",
      snippet: `-- AI-extracted: only fragments contributing to ${featureName}
SELECT user_id,
       SUM(CASE WHEN event_type='OVERDUE' THEN amount END) AS overdue_amt_30d,
       COUNT(CASE WHEN event_type='REPAY'  THEN 1 END)    AS repay_cnt_30d
FROM ods.user_credit_events
WHERE dt BETWEEN DATE_SUB('\${dt}',30) AND '\${dt}'
GROUP BY user_id;`,
      dataverseUrl: "#",
    },
    {
      id: "p-t-3", order: 3,
      taskName: "ads_user_risk_score_ods",
      path: "training", stageLabel: "Final Scoring",
      inputAssets: ["dwd.user_credit_30d_features", "dim.user_meta"],
      outputAsset: `risk_db.user_risk_score_ods → ${featureName}`,
      language: "SQL (Spark Batch)",
      description: `将中间聚合特征加权计算，产出最终特征列 ${featureName}。通过 LEAST/GREATEST 进行分数裁剪，确保值域在 300–999 之间。`,
      reviewStatus: "AI-KAG",
      snippet: `-- Final scoring step: column \`${featureName}\`
SELECT user_id,
       LEAST(999,
             GREATEST(300,
                ROUND(600
                  + 1.5 * COALESCE(repay_cnt_30d,0)
                  - 0.8 * COALESCE(overdue_amt_30d,0)/100)
             )) AS risk_score
FROM dwd.user_credit_30d_features
WHERE dt = '\${dt}';`,
      dataverseUrl: "#",
    },
    {
      id: "p-s-1", order: 1,
      taskName: "credit_events_kafka_source",
      path: "serving", stageLabel: "Kafka Ingest",
      inputAssets: ["kafka.credit_events"],
      outputAsset: "stream.credit_events_enriched",
      language: "Flink SQL",
      description: "从 Kafka topic 消费实时信用事件流，定义 Watermark 和 Schema，作为 Flink 流处理的源表。",
      reviewStatus: "AI-KAG",
      snippet: `CREATE TABLE credit_events_src (
  user_id STRING,
  event_type STRING,
  amount DECIMAL(18,2),
  event_ts TIMESTAMP(3),
  WATERMARK FOR event_ts AS event_ts - INTERVAL '5' SECOND
) WITH ('connector'='kafka', 'topic'='credit_events', ...);`,
      dataverseUrl: "#",
    },
    {
      id: "p-s-2", order: 2,
      taskName: "credit_risk_score_realtime",
      path: "serving", stageLabel: "Flink Real-time Compute",
      inputAssets: ["stream.credit_events_enriched"],
      outputAsset: "hbase.user_risk:cf:risk_score_raw",
      language: "Flink SQL",
      description: "在 Flink 流上实时计算风险分，通过 TUMBLE 窗口聚合后写入 HBase，作为 FeatureSource 的在线存储层。",
      reviewStatus: "AI-KAG",
      snippet: `INSERT INTO user_risk_hbase_sink
SELECT user_id,
       LEAST(999,
             GREATEST(300,
                ROUND(600
                  + 1.5 * repay_cnt_30d_rt
                  - 0.8 * overdue_amt_30d_rt/100)
             )) AS risk_score_raw
FROM TABLE(TUMBLE(TABLE credit_events_src, DESCRIPTOR(event_ts), INTERVAL '1' MINUTE));`,
      dataverseUrl: "#",
    },
    {
      id: "p-s-3", order: 3,
      taskName: "FG Serving Canvas · ID · V1",
      path: "serving", stageLabel: "FG Serving Canvas",
      inputAssets: ["hbase.user_risk:cf:risk_score_raw  (via FeatureSource)"],
      outputAsset: `feature: ${featureName}`,
      language: "Groovy",
      description: "在线 Serving 阶段：通过 HBase FeatureSource 扫描获取 raw value，经 Groovy Transformer 进行黑名单过滤和分数裁剪，产出最终 online Fine Feature。",
      reviewStatus: "AI-KAG",
      snippet: `def raw = HBaseCall.query(
    tableName: "user_risk",
    rowKey: input.user_id,
    qualifier: "cf:risk_score_raw"
)
if (raw == null || raw.risk_score_raw == null) {
    output.risk_score = -1; return
}
def score = raw.risk_score_raw as int
if (input.is_blacklisted) { output.risk_score = 999; return }
output.risk_score = Math.max(300, Math.min(900, score))`,
      dataverseUrl: "#",
    },
  ];
}

// ─── Upstream DAG nodes (shared between Lineage modes) ─────────────────────────
interface UpstreamNode { id: string; label: string; type: "source" | "hive" | "kafka" | "flink" | "hbase" | "fs" | "fg" | "feature"; }

const NODE_STYLE: Record<UpstreamNode["type"], { bg: string; border: string; text: string; dot?: string }> = {
  source:  { bg: "bg-slate-100/80",        border: "border-slate-300",       text: "text-slate-600" },
  hive:    { bg: "bg-emerald-50/60", border: "border-emerald-200", text: "text-emerald-800", dot: "bg-emerald-400" },
  kafka:   { bg: "bg-violet-50/60",  border: "border-violet-200",  text: "text-violet-800",  dot: "bg-violet-400" },
  flink:   { bg: "bg-violet-50/60",  border: "border-violet-200",  text: "text-violet-800",  dot: "bg-violet-400" },
  hbase:   { bg: "bg-violet-50/60",  border: "border-violet-200",  text: "text-violet-800",  dot: "bg-violet-400" },
  fs:      { bg: "bg-violet-50/60",  border: "border-violet-200",  text: "text-violet-800",  dot: "bg-violet-400" },
  fg:      { bg: "bg-teal-50/60",    border: "border-teal-300",    text: "text-teal-700",    dot: "bg-teal-400" },
  feature: { bg: "bg-teal-600",      border: "border-teal-600",    text: "text-white" },
};

const UPSTREAM_NODES: UpstreamNode[] = [
  { id: "binlog", label: "binlog.user_credit_events", type: "source" },
  { id: "ods", label: "ods.user_credit_events", type: "hive" },
  { id: "dwd", label: "dwd.user_credit_30d_features", type: "hive" },
  { id: "ads", label: "risk_db.user_risk_score_ods", type: "hive" },
  { id: "kafka", label: "kafka.credit_events", type: "kafka" },
  { id: "stream", label: "stream.credit_events_enriched", type: "flink" },
  { id: "hbase", label: "hbase.user_risk:cf", type: "hbase" },
  { id: "fs", label: "FeatureSource", type: "fs" },
  { id: "fg", label: "FG Serving Canvas\nGroovy V1", type: "fg" },
  { id: "feature", label: "risk_score", type: "feature" },
];

// ─── Component ────────────────────────────────────────────────────────────────
type TraceTab = "lineage" | "freshness" | "health";

export function FeatureTraceModal({
  open,
  featureName,
  hasTraining,
  hasServing,
  onClose,
}: {
  open: boolean;
  featureName: string;
  hasTraining: boolean;
  hasServing: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<TraceTab>("lineage");

  const freshnessSignals = useMemo(() => buildMockFreshnessSignals(featureName), [featureName]);
  const driftSignals = useMemo(() => buildMockDriftSignals(featureName), [featureName]);
  const processingStages = useMemo(() => buildMockProcessingStages(featureName), [featureName]);
  const healthRules = useMemo(() => buildMockHealthRules(), []);

  useEffect(() => {
    if (!open) return;
    setTab("lineage");
  }, [open, featureName]);

  const freshnessWarningCount = freshnessSignals.filter((s) => s.severity === "warning" || s.severity === "critical").length;
  const freshnessSummary =
    freshnessWarningCount > 0
      ? `${freshnessWarningCount} warning`
      : "all on track";

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-5xl mx-4 max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ─── Header ─── */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-teal-200 mt-0.5">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-slate-800 text-base font-semibold tracking-tight">Feature Trace</h2>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">
                <span className="text-teal-700 font-semibold">{featureName}</span>
                <span className="mx-1.5 text-slate-300">·</span>
                <span className="text-slate-500">
                  Knowledge distilled from upstream pipelines · AI agent refined · T+1 sync
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ─── Tabs ─── */}
        <div className="flex border-b border-slate-100 px-6 flex-shrink-0 bg-slate-50/30">
          <TabBtn
            active={tab === "lineage"}
            onClick={() => setTab("lineage")}
            icon={<GitBranch className="w-3.5 h-3.5" />}
            label="Lineage"
            subtitle="Topology + KAG logic"
          />
          <TabBtn
            active={tab === "freshness"}
            onClick={() => setTab("freshness")}
            icon={<Activity className="w-3.5 h-3.5" />}
            label="Freshness"
            subtitle={freshnessSummary}
            badge={
              freshnessWarningCount > 0
                ? { count: freshnessWarningCount, color: "bg-amber-500" }
                : undefined
            }
          />
          <TabBtn
            active={tab === "health"}
            onClick={() => setTab("health")}
            icon={<Gauge className="w-3.5 h-3.5" />}
            label="Monitor"
            subtitle="Alert rules"
          />
        </div>

        {/* ─── Body ─── */}
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }} className="flex-1 overflow-y-auto">
          {tab === "lineage" && <MergedTraceTabContent featureName={featureName} stages={processingStages} />}
          {tab === "freshness" && (
            <FreshnessTabContent signals={freshnessSignals} featureName={featureName} hasTraining={hasTraining} hasServing={hasServing} />
          )}
          {tab === "health" && (
            <HealthConfigTabContent rules={healthRules} featureName={featureName} />
          )}
          </motion.div>
        </AnimatePresence>

        {/* ─── Footer ─── */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 text-[11px] text-slate-500 flex items-center justify-between flex-shrink-0">
          <span className="flex items-center gap-1.5">
            <Brain className="w-3 h-3 text-teal-500" />
            Knowledge auto-synced from Unity Catalog · last update 2026-05-15 02:00 UTC
          </span>
          <span className="flex items-center gap-3 text-slate-400">
            {hasTraining && (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Training
              </span>
            )}
            {hasServing && (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                Serving
              </span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Tab button ───────────────────────────────────────────────────────────────
function TabBtn({
  active,
  onClick,
  icon,
  label,
  subtitle,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  subtitle?: string;
  badge?: { count: number; color: string };
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-2 px-4 py-3 mr-1 transition-all ${
        active
          ? "text-teal-700"
          : "text-slate-500 hover:text-slate-700"
      }`}
    >
      <span className="flex flex-col items-start gap-0">
        <span className="flex items-center gap-1.5 text-[13px] font-semibold">
          {icon}
          {label}
          {badge && (
            <span className={`ml-0.5 inline-flex items-center justify-center min-w-[16px] h-4 rounded-full text-[9px] font-bold text-white ${badge.color} px-1`}>
              {badge.count}
            </span>
          )}
        </span>
        {subtitle && (
          <span className="text-[10px] opacity-60 font-normal">{subtitle}</span>
        )}
      </span>
      {active && (
        <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-teal-500 rounded-full" />
      )}
    </button>
  );
}

// ─── Tab 1: Lineage ───────────────────────────────────────────────────────────
// ─── Split nodes into Training and Serving branches ───────────────────────────
const TRAINING_NODES = UPSTREAM_NODES.filter(n => ["source", "hive"].includes(n.type) && n.id !== "feature");
const SERVING_NODES  = UPSTREAM_NODES.filter(n => ["kafka", "flink", "hbase", "fs", "fg"].includes(n.type));
const TERMINAL_NODE  = UPSTREAM_NODES.find(n => n.type === "feature");

const COLUMNS = 5;

function chunkNodes(nodes: typeof UPSTREAM_NODES, cols: number) {
  const chunks: typeof UPSTREAM_NODES[] = [];
  for (let i = 0; i < nodes.length; i += cols) {
    chunks.push(nodes.slice(i, i + cols));
  }
  return chunks;
}

function FlowArrowSmall() {
  return (
    <svg width="18" height="12" viewBox="0 0 18 12" className="text-slate-300">
      <path d="M0 3h12v4H0z" fill="currentColor" className="opacity-40" />
      <path d="M12 0l5 5.5L12 11" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Arrow between two adjacent nodes in the same row
function FlowArrow() {
  return (
    <div className="flex items-center justify-center flex-shrink-0 px-0.5">
      <svg width="20" height="12" viewBox="0 0 20 12" className="text-slate-300">
        <path d="M0 4h14v3H0z" fill="currentColor" className="opacity-40" />
        <path d="M14 0l5 5.5L14 11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

// Vertical connector between rows
function RowConnector({ cols }: { cols: number }) {
  return (
    <div className="flex items-center h-6">
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} className="flex-1 flex items-center justify-center">
          {i === Math.floor(cols / 2) && (
            <svg width="14" height="14" viewBox="0 0 14 14" className="text-slate-300">
              <path d="M5 0v8h4V0M0 8h4v3h6V8h4M5 11l2 3 2-3" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Merged Trace Tab (Lineage topology + Processing detail) ──────────────────
function MergedTraceTabContent({ featureName, stages }: { featureName: string; stages: ProcessingStage[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);

  // Merge Training → Serving → Terminal into one flow
  const flowNodes = [...TRAINING_NODES, ...SERVING_NODES, ...(TERMINAL_NODE ? [TERMINAL_NODE] : [])];
  const rows = chunkNodes(flowNodes, COLUMNS);

  const selectedNode = UPSTREAM_NODES.find((n) => n.id === selectedId);

  // Map connector positions to processing stages
  const trainingConnectors = useMemo(() => {
    const trainingStages = stages.filter(s => s.path === "training");
    return TRAINING_NODES.slice(0, -1).map((_, i) => trainingStages[i] ?? null).filter(Boolean) as ProcessingStage[];
  }, [stages]);
  const servingConnectors = useMemo(() => {
    const servingStages = stages.filter(s => s.path === "serving");
    return SERVING_NODES.slice(0, -1).map((_, i) => servingStages[i] ?? null).filter(Boolean) as ProcessingStage[];
  }, [stages]);

  const selectedStage = stages.find(s => s.id === selectedStageId) ?? null;

  return (
    <div className="px-4 sm:px-6 py-5">
      {/* Section label */}
      <div className="flex items-center gap-2 mb-5 text-[11px] text-slate-400 uppercase tracking-wider">
        <GitBranch className="w-3 h-3 text-teal-500" />
        <span>Full pipeline topology</span>
        <span className="text-slate-300">—</span>
        <span className="text-slate-500 normal-case tracking-normal">from raw data to fine feature</span>
      </div>

      {/* ─── DAG Grid ─── */}
      <div className="rounded-2xl bg-gradient-to-b from-slate-50/80 to-white border border-slate-200/80 p-4 sm:p-6 shadow-sm">
        {/* Training branch label */}
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-semibold text-emerald-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Training Path
          </div>
        </div>

        {/* Training nodes row */}
        <div className="grid gap-2 mb-4" style={{ gridTemplateColumns: `repeat(${COLUMNS}, minmax(0, 1fr))` }}>
          {TRAINING_NODES.map((node, idx) => (
            <motion.div
              key={node.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.07, duration: 0.3 }}
              className="flex items-center gap-1 min-w-0"
            >
              <NodeButton node={node} selectedId={selectedId} onSelect={setSelectedId} />
              {idx < TRAINING_NODES.length - 1 ? (
                <div className="flex flex-col items-center justify-center flex-shrink-0 gap-1 group">
                  <div className="flex items-center justify-center px-0.5">
                    <svg width="28" height="16" viewBox="0 0 28 16" className="text-slate-300 group-hover:text-teal-400 transition-colors">
                      <path d="M0 4h14v3H0z" fill="currentColor" className="opacity-40" />
                      <path d="M14 0l5 5.5L14 11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  {(() => {
                    const conn = trainingConnectors[idx];
                    if (!conn) return null;
                    const isSel = selectedStageId === conn.id;
                    return (
                      <button
                        onClick={() => { setSelectedStageId(isSel ? null : conn.id); setSelectedId(null); }}
                        className={`text-[9px] px-1.5 py-0.5 rounded border transition-all whitespace-nowrap opacity-0 group-hover:opacity-100 ${
                          isSel
                            ? "bg-teal-500 text-white border-teal-500 opacity-100"
                            : "bg-white text-slate-400 border-slate-200"
                        }`}
                        title={conn.taskName}
                      >
                        {conn.taskName}
                      </button>
                    );
                  })()}
                </div>
              ) : (
                <div className="flex items-center justify-center flex-shrink-0 px-0.5">
                  <FlowArrowSmall />
                </div>
              )}
            </motion.div>
          ))}
          {Array.from({ length: Math.max(0, COLUMNS - TRAINING_NODES.length) }).map((_, i) => (
            <div key={`train-empty-${i}`} className="flex-1" />
          ))}
        </div>

        {/* Connector */}
        <RowConnector cols={COLUMNS} />

        {/* Serving branch label */}
        <div className="flex items-center gap-2 mb-2 mt-1">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-violet-50 border border-violet-200 text-[10px] font-semibold text-violet-700">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400" /> Serving Path
          </div>
        </div>

        {/* Serving nodes */}
        <div className="grid gap-2 mb-3" style={{ gridTemplateColumns: `repeat(${COLUMNS}, minmax(0, 1fr))` }}>
          {SERVING_NODES.map((node, idx) => (
            <motion.div
              key={node.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.07 + 0.25, duration: 0.3 }}
              className="flex items-center gap-1 min-w-0"
            >
              <NodeButton node={node} selectedId={selectedId} onSelect={setSelectedId} />
              {idx < SERVING_NODES.length - 1 ? (
                <div className="flex flex-col items-center justify-center flex-shrink-0 gap-1 group">
                  <div className="flex items-center justify-center px-0.5">
                    <svg width="28" height="16" viewBox="0 0 28 16" className="text-slate-300 group-hover:text-teal-400 transition-colors">
                      <path d="M0 4h14v3H0z" fill="currentColor" className="opacity-40" />
                      <path d="M14 0l5 5.5L14 11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  {(() => {
                    const conn = servingConnectors[idx];
                    if (!conn) return null;
                    const isSel = selectedStageId === conn.id;
                    return (
                      <button
                        onClick={() => { setSelectedStageId(isSel ? null : conn.id); setSelectedId(null); }}
                        className={`text-[9px] px-1.5 py-0.5 rounded border transition-all whitespace-nowrap opacity-0 group-hover:opacity-100 ${
                          isSel
                            ? "bg-teal-500 text-white border-teal-500 opacity-100"
                            : "bg-white text-slate-400 border-slate-200"
                        }`}
                        title={conn.taskName}
                      >
                        {conn.taskName}
                      </button>
                    );
                  })()}
                </div>
              ) : (
                <div className="flex items-center justify-center flex-shrink-0 px-0.5">
                  <FlowArrowSmall />
                </div>
              )}
            </motion.div>
          ))}
          {Array.from({ length: Math.max(0, COLUMNS - SERVING_NODES.length) }).map((_, i) => (
            <div key={`serve-empty-${i}`} className="flex-1" />
          ))}
        </div>

        {/* Connector */}
        <RowConnector cols={COLUMNS} />

        {/* Terminal feature node — centered */}
        {TERMINAL_NODE && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.55, duration: 0.35 }}
            className="flex justify-center pt-2"
          >
            <div className="flex items-center gap-3">
              <NodeButton node={TERMINAL_NODE} selectedId={selectedId} onSelect={setSelectedId} />
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 text-[10px] font-medium text-teal-700">
                <CheckCircle2 className="w-3 h-3" />
                Fine Feature
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Selected pipeline task detail (AI-KAG) */}
      {selectedStage && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-5 space-y-4"
        >
          <div className="flex items-center gap-2 text-[11px] text-slate-400 uppercase tracking-wider">
            <FileText className="w-3 h-3 text-teal-500" />
            <span>AI-distilled processing logic for</span>
            <span className="font-mono text-teal-600 normal-case tracking-normal">{featureName}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            {/* Detail card */}
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 bg-slate-50/60 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border bg-slate-100 text-slate-700 border-slate-200">
                    {selectedStage.path === "training"
                      ? <Layers className="w-3 h-3" />
                      : <Zap className="w-3 h-3" />
                    }
                    {selectedStage.path === "training" ? "Spark Batch" : "Flink Stream"}
                  </span>
                  <span className="text-xs font-mono text-slate-800">{selectedStage.taskName}</span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border bg-teal-50 text-teal-700 border-teal-200">
                    <Sparkles className="w-3 h-3" />
                    AI-KAG
                  </span>
                </div>
                {selectedStage.dataverseUrl ? (
                  <a href={selectedStage.dataverseUrl} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-teal-600 hover:text-teal-800">
                    View in DataVerse <ExternalLink className="w-3 h-3" />
                  </a>
                ) : null}
              </div>

              <div className="px-4 py-3 grid grid-cols-2 gap-3 text-[11px] border-b border-slate-100">
                <div>
                  <div className="text-slate-400 uppercase tracking-wide text-[10px] mb-1">Input</div>
                  <div className="flex flex-wrap gap-1">
                    {selectedStage.inputAssets.map((a) => (
                      <span key={a} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono border border-slate-200">{a}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 uppercase tracking-wide text-[10px] mb-1">Output</div>
                  <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono border border-slate-200">{selectedStage.outputAsset}</span>
                </div>
              </div>

              <div className="bg-slate-900 text-slate-100 px-4 py-3 font-mono text-[11.5px] leading-relaxed overflow-x-auto">
                <div className="flex items-center gap-2 mb-2 text-[10px] uppercase tracking-wide text-slate-400">
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  <span>AI-extracted · only fragments related to <span className="text-teal-300">{featureName}</span></span>
                </div>
                <pre className="whitespace-pre">{selectedStage.snippet}</pre>
              </div>
            </div>

            {/* Context card */}
            <div className="space-y-3">
              <div className={`rounded-xl border px-4 py-3 ${selectedStage.path === "training" ? "bg-emerald-50/60 border-emerald-200" : "bg-violet-50/60 border-violet-200"}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-slate-800">{selectedStage.stageLabel}</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">{selectedStage.description}</p>
              </div>
              <div className="rounded-xl border px-4 py-3 bg-teal-50/60 border-teal-200">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold bg-teal-50 text-teal-700 border-teal-200">
                    <Sparkles className="w-3 h-3" />
                    AI-KAG
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Logic auto-extracted by AI Agent from upstream code repositories (Git). Refined by T+1 batch processing from Unity Catalog metadata and OpenLineage traces.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Legend */}
      <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1.5 text-[10px] px-1">
        <span className="flex items-center gap-1.5 text-slate-400">
          <span className="w-2 h-2 rounded-sm border border-slate-300 bg-slate-50" /> External source
        </span>
        <span className="flex items-center gap-1.5 text-slate-400">
          <span className="w-2 h-2 rounded-sm bg-emerald-100 border border-emerald-200" /> Training (Hive)
        </span>
        <span className="flex items-center gap-1.5 text-slate-400">
          <span className="w-2 h-2 rounded-sm bg-violet-100 border border-violet-200" /> Serving (Kafka/Flink/HBase)
        </span>
        <span className="flex items-center gap-1.5 text-slate-400">
          <span className="w-2 h-2 rounded-sm bg-teal-600 border border-teal-600" /> Fine Feature
        </span>
      </div>
    </div>
  );
}

// ─── Node Button (extracted for reuse) ────────────────────────────────────────
function NodeButton({
  node,
  selectedId,
  onSelect,
}: {
  node: (typeof UPSTREAM_NODES)[number];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const isSel = selectedId === node.id;
  const isTerminal = node.type === "feature";
  const isTraining = node.type === "source" || node.type === "hive";
  const isServing = node.type === "kafka" || node.type === "flink" || node.type === "hbase" || node.type === "fs" || node.type === "fg";

  let borderColor = "border-slate-200";
  let bgColor = "bg-white";
  let textColor = "text-slate-700";
  let hoverBg = "hover:bg-slate-50";
  let dotColor = "";

  if (isTerminal) {
    borderColor = "border-teal-600";
    bgColor = "bg-teal-600";
    textColor = "text-white";
    hoverBg = "hover:bg-teal-700";
  } else if (isTraining) {
    borderColor = "border-emerald-200";
    bgColor = "bg-emerald-50/60";
    textColor = "text-emerald-800";
    hoverBg = "hover:bg-emerald-100/80";
    dotColor = "bg-emerald-400";
  } else if (isServing) {
    borderColor = "border-violet-200";
    bgColor = "bg-violet-50/60";
    textColor = "text-violet-800";
    hoverBg = "hover:bg-violet-100/80";
    dotColor = "bg-violet-400";
  }

  return (
    <button
      onClick={() => onSelect(isSel ? null : node.id)}
      className={`relative rounded-xl border px-4 py-3.5 text-xs transition-all text-center w-full ${
        bgColor} ${textColor} ${borderColor} ${hoverBg} ${
        isSel
          ? "ring-2 ring-teal-400 ring-offset-1 scale-[1.04] shadow-md"
          : "hover:shadow-sm hover:scale-[1.02]"
      }`}
      style={{ whiteSpace: "pre-line", wordBreak: "break-word" }}
    >
      {dotColor && (
        <span className={`absolute top-1.5 left-1.5 w-1.5 h-1.5 rounded-full ${dotColor}`} />
      )}
      <span className={dotColor ? "ml-1" : ""}>{node.label}</span>
    </button>
  );
}

// ─── Health path config ──────────────────────────────────────────────────────
const HEALTH_PATH: Record<string, {
  label: string;
  accentBg: string; accentBorder: string; accentText: string;
  emptyIcon: React.ReactNode;
  emptyText: string;
}> = {
  training: {
    label: "Training",
    accentBg: "bg-emerald-50/60", accentBorder: "border-emerald-200", accentText: "text-emerald-700",
    emptyIcon: <Layers className="w-8 h-8 text-emerald-300" />,
    emptyText: "No Training freshness signals",
  },
  serving: {
    label: "Serving",
    accentBg: "bg-violet-50/60", accentBorder: "border-violet-200", accentText: "text-violet-700",
    emptyIcon: <Zap className="w-8 h-8 text-violet-300" />,
    emptyText: "No Serving freshness signals",
  },
};

// ─── Tab 2: Freshness (Lagging / Latency only — no drift) ────────────────────
function FreshnessTabContent({
  signals,
  featureName,
  hasTraining,
  hasServing,
}: {
  signals: HealthSignal[];
  featureName: string;
  hasTraining: boolean;
  hasServing: boolean;
}) {
  const [filterSeverity, setFilterSeverity] = useState<"all" | "warning" | "critical">("all");

  const trainingSignals = signals.filter((s) => s.path === "training");
  const servingSignals  = signals.filter((s) => s.path === "serving");

  const filterFn = (s: HealthSignal) => {
    if (filterSeverity === "all") return true;
    if (filterSeverity === "warning") return s.severity === "warning" || s.severity === "critical";
    return s.severity === "critical";
  };

  const filteredTraining = trainingSignals.filter(filterFn);
  const filteredServing  = servingSignals.filter(filterFn);

  const tOk = trainingSignals.filter((s) => s.severity === "ok").length;
  const tWarn = trainingSignals.filter((s) => s.severity === "warning" || s.severity === "critical").length;
  const sOk = servingSignals.filter((s) => s.severity === "ok").length;
  const sWarn = servingSignals.filter((s) => s.severity === "warning" || s.severity === "critical").length;

  const summaryOk = tOk + sOk;
  const summaryWarn = tWarn + sWarn;

  return (
    <div className="px-4 sm:px-6 py-5 space-y-5">
      {/* Section label */}
      <div className="flex items-center gap-2 text-[11px] text-slate-400 uppercase tracking-wider">
        <Activity className="w-3 h-3 text-teal-500" />
        <span>Upstream pipeline freshness for</span>
        <span className="font-mono text-teal-600 normal-case tracking-normal">{featureName}</span>
      </div>

      {/* Summary bar */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
            <Activity className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-[10px] text-slate-400 flex items-center gap-2">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> {summaryOk} OK
            </span>
            {summaryWarn > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> {summaryWarn} warning
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 ml-auto">
          {(["all", "warning"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilterSeverity(f)}
              className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors ${
                filterSeverity === f
                  ? "bg-white text-slate-700 border border-slate-300 shadow-sm"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {f === "all" ? "All" : "Warnings"}
            </button>
          ))}
        </div>
      </div>

      {/* Two parallel columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <FreshnessPathColumn path="training" signals={filteredTraining} hasPath={hasTraining} />
        <FreshnessPathColumn path="serving"  signals={filteredServing}  hasPath={hasServing}  />
      </div>
    </div>
  );
}

function FreshnessPathColumn({
  path,
  signals,
  hasPath,
}: {
  path: "training" | "serving";
  signals: HealthSignal[];
  hasPath: boolean;
}) {
  const cfg = HEALTH_PATH[path];
  if (!hasPath && signals.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className={`rounded-xl border ${cfg.accentBorder} ${cfg.accentBg} px-4 py-3`}>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${cfg.accentBg} ${cfg.accentBorder} border ${cfg.accentText} text-[11px] font-semibold`}>
            <span className={`w-1.5 h-1.5 rounded-full ${path === "training" ? "bg-emerald-400" : "bg-violet-400"}`} />
            {cfg.label} Freshness
          </span>
        </div>
        <p className="text-[10px] text-slate-500 leading-relaxed mt-1">
          {path === "training"
            ? "Hive ODS/DWD/ADS pipeline · ingestion latency, partition freshness"
            : "Kafka/Flink/HBase/FG pipeline · consumer lag, write freshness, serving latency"}
        </p>
      </div>

      {signals.length > 0 ? (
        <div className="space-y-2.5">
          {signals.map((signal) => {
            const sev = SEVERITY_STYLE[signal.severity];
            return (
              <motion.div
                key={signal.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`rounded-xl border p-3.5 transition-shadow hover:shadow-sm ${
                  signal.severity === "critical"
                    ? "border-red-200 bg-red-50/30"
                    : signal.severity === "warning"
                      ? "border-amber-200 bg-amber-50/20"
                      : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${sev.cls} flex-shrink-0`}>
                      {sev.icon}
                      {signal.signalType === "latency" ? "Latency" : signal.signalType === "freshness" ? "Freshness" : "OK"}
                    </span>
                    <div className="min-w-0">
                      <div className="text-[12px] font-semibold text-slate-800">{signal.summary}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate" title={signal.stage}>{signal.stage}</div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed max-w-2xl">{signal.detail}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                    <span className={`text-[12px] font-mono font-bold ${
                      signal.severity === "critical" ? "text-red-600" : signal.severity === "warning" ? "text-amber-600" : "text-emerald-600"
                    }`}>{signal.value}</span>
                    <span className="text-[9px] text-slate-400">baseline: {signal.baseline}</span>
                    <span className="text-[9px] text-slate-400 flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{signal.updatedAt}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className={`rounded-xl border border-dashed ${cfg.accentBorder} ${cfg.accentBg} flex flex-col items-center justify-center py-10 px-4 text-center`}>
          {cfg.emptyIcon}
          <p className="text-xs text-slate-400 mt-2">{cfg.emptyText}</p>
        </div>
      )}
    </div>
  );
}

// ─── Tab 3: Health (Monitoring Rules Configuration) ───────────────────────────
function HealthConfigTabContent({
  rules: initialRules,
  featureName,
}: {
  rules: HealthRule[];
  featureName: string;
}) {
  const [rules, setRules] = useState<HealthRule[]>(initialRules);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<HealthRule>>({});
  const [receiverInput, setReceiverInput] = useState("");
  const [showReceiverDropdown, setShowReceiverDropdown] = useState(false);

  const isAdding = editingId === "__new__";
  const isEditing = editingId !== null;

  function startAdd() {
    setEditingId("__new__");
    setDraft({ metric: "null_pct", operator: ">=", threshold: "", receivers: [], enabled: true });
    setReceiverInput("");
    setShowReceiverDropdown(false);
  }

  function startEdit(rule: HealthRule) {
    setEditingId(rule.id);
    setDraft({ ...rule });
    setReceiverInput("");
    setShowReceiverDropdown(false);
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft({});
    setReceiverInput("");
    setShowReceiverDropdown(false);
  }

  function saveRule() {
    if (!draft.metric || !draft.operator || !draft.threshold?.trim()) return;
    const saved: HealthRule = {
      id: isAdding ? `r_${Date.now()}` : editingId!,
      metric: draft.metric as HealthRule["metric"],
      operator: draft.operator as HealthRule["operator"],
      threshold: draft.threshold,
      receivers: draft.receivers ?? [],
      enabled: draft.enabled ?? true,
    };
    if (isAdding) {
      setRules(prev => [...prev, saved]);
    } else {
      setRules(prev => prev.map(r => r.id === saved.id ? saved : r));
    }
    cancelEdit();
  }

  function deleteRule(id: string) {
    setRules(prev => prev.filter(r => r.id !== id));
    if (editingId === id) cancelEdit();
  }

  function toggleRule(id: string) {
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  }

  function addReceiver() {
    const email = receiverInput.trim();
    if (!email || !draft.receivers || draft.receivers.includes(email)) return;
    setDraft(prev => ({ ...prev, receivers: [...(prev.receivers ?? []), email] }));
    setReceiverInput("");
    setShowReceiverDropdown(false);
  }

  function removeReceiver(email: string) {
    setDraft(prev => ({ ...prev, receivers: (prev.receivers ?? []).filter(r => r !== email) }));
  }

  function handleReceiverKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") { e.preventDefault(); addReceiver(); }
  }

  const filteredReceivers = MOCK_RECEIVERS.filter(
    r => r.toLowerCase().includes(receiverInput.toLowerCase()) && !(draft.receivers ?? []).includes(r)
  );

  return (
    <div className="px-4 sm:px-6 py-5 space-y-5">
      {/* Section label */}
      <div className="flex items-center gap-2 text-[11px] text-slate-400 uppercase tracking-wider">
        <Gauge className="w-3 h-3 text-teal-500" />
        <span>Health monitoring rules for</span>
        <span className="font-mono text-teal-600 normal-case tracking-normal">{featureName}</span>
      </div>

      <div className="rounded-xl border border-slate-200 overflow-hidden">
        {/* Column headers */}
        <div className="px-4 py-3 bg-slate-50/60 border-b border-slate-200 flex items-center gap-4 text-[10px] uppercase tracking-wide text-slate-400 font-medium">
          <span className="w-5 flex-shrink-0" />
          <span className="flex-1">Metric</span>
          <span className="w-20 text-center">Operator</span>
          <span className="w-20 text-center">Threshold</span>
          <span className="flex-1">Receiver(s)</span>
          <span className="w-16 text-center">Status</span>
          <span className="w-14" />
        </div>

        {/* Rule rows */}
        <div className="divide-y divide-slate-50">
          {rules.map((rule) => {
            const isActive = editingId === rule.id;
            const metricLabel = METRIC_OPTIONS.find(m => m.value === rule.metric)?.label ?? rule.metric;
            const metricColor =
              rule.metric === "null_pct" ? "bg-sky-50 text-sky-700 border-sky-200" :
              rule.metric === "fail_pct" ? "bg-red-50 text-red-600 border-red-200" :
              "bg-amber-50 text-amber-700 border-amber-200";

            if (isActive) {
              return (
                <div key={rule.id} className="px-4 py-3 bg-teal-50/30 flex items-center gap-4">
                  {/* Metric */}
                  <select
                    value={draft.metric ?? "null_pct"}
                    onChange={e => setDraft(prev => ({ ...prev, metric: e.target.value as HealthRule["metric"] }))}
                    className="flex-1 px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
                  >
                    {METRIC_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  {/* Operator */}
                  <select
                    value={draft.operator ?? ">="}
                    onChange={e => setDraft(prev => ({ ...prev, operator: e.target.value as HealthRule["operator"] }))}
                    className="w-20 px-2 py-1.5 rounded-lg border border-slate-200 text-xs text-center font-mono bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
                  >
                    {OPERATOR_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  {/* Threshold */}
                  <input
                    value={draft.threshold ?? ""}
                    onChange={e => setDraft(prev => ({ ...prev, threshold: e.target.value }))}
                    placeholder="e.g. 5"
                    className="w-20 px-2 py-1.5 rounded-lg border border-slate-200 text-xs text-center font-mono bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                  {/* Receivers */}
                  <div className="flex-1 relative">
                    <div className="flex flex-wrap gap-1 mb-1">
                      {(draft.receivers ?? []).map(email => (
                        <span key={email} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white text-[10px] text-slate-600 border border-slate-200">
                          {email}
                          <button onClick={() => removeReceiver(email)} className="text-slate-400 hover:text-red-500">
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="relative">
                      <input
                        value={receiverInput}
                        onChange={e => { setReceiverInput(e.target.value); setShowReceiverDropdown(true); }}
                        onFocus={() => setShowReceiverDropdown(true)}
                        onKeyDown={handleReceiverKeyDown}
                        placeholder="Add email..."
                        className="w-full px-2 py-1 rounded border border-slate-200 text-[10px] bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
                      />
                      {showReceiverDropdown && filteredReceivers.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 max-h-28 overflow-y-auto">
                          {filteredReceivers.map(r => (
                            <button
                              key={r}
                              onClick={() => { setReceiverInput(r); addReceiver(); }}
                              className="w-full text-left px-2.5 py-1.5 text-[10px] text-slate-600 hover:bg-teal-50 font-mono"
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Status toggle */}
                  <div className="w-16 flex justify-center">
                    <button
                      onClick={() => setDraft(prev => ({ ...prev, enabled: !(prev.enabled ?? true) }))}
                      className={`relative w-8 h-4 rounded-full transition-colors ${(draft.enabled ?? true) ? "bg-teal-500" : "bg-slate-200"}`}
                    >
                      <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${(draft.enabled ?? true) ? "left-4" : "left-0.5"}`} />
                    </button>
                  </div>
                  {/* Actions */}
                  <div className="w-14 flex items-center gap-1.5 justify-end">
                    <button onClick={saveRule} className="p-1 rounded text-teal-600 hover:bg-teal-100 transition-colors" title="Save">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={cancelEdit} className="p-1 rounded text-slate-400 hover:bg-slate-100 transition-colors" title="Cancel">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div key={rule.id} className="px-4 py-3 flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
                {/* Drag handle */}
                <span className="w-5 flex items-center justify-center text-slate-300 cursor-grab">
                  <svg width="8" height="12" viewBox="0 0 8 12" fill="currentColor">
                    <circle cx="2" cy="2" r="1" /><circle cx="6" cy="2" r="1" />
                    <circle cx="2" cy="6" r="1" /><circle cx="6" cy="6" r="1" />
                    <circle cx="2" cy="10" r="1" /><circle cx="6" cy="10" r="1" />
                  </svg>
                </span>
                {/* Metric */}
                <span className="flex-1">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${metricColor}`}>
                    {rule.metric === "null_pct" && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>}
                    {rule.metric === "fail_pct" && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}
                    {rule.metric === "drift" && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>}
                    {metricLabel}
                  </span>
                </span>
                {/* Operator */}
                <span className="w-20 text-center text-xs font-mono text-slate-600">{rule.operator}</span>
                {/* Threshold */}
                <span className="w-20 text-center text-xs font-mono text-slate-700 font-semibold">{rule.threshold}</span>
                {/* Receivers */}
                <span className="flex-1">
                  <div className="flex flex-wrap gap-1">
                    {rule.receivers.slice(0, 2).map(email => (
                      <span key={email} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-[10px] text-slate-500 font-mono border border-slate-200">
                        {email}
                      </span>
                    ))}
                    {rule.receivers.length > 2 && (
                      <span className="text-[10px] text-slate-400">+{rule.receivers.length - 2} more</span>
                    )}
                  </div>
                </span>
                {/* Status */}
                <div className="w-16 flex justify-center">
                  <button onClick={() => toggleRule(rule.id)} className="relative w-8 h-4 rounded-full transition-colors" style={{ backgroundColor: rule.enabled ? "#13c2c2" : "#cbd5e1" }}>
                    <span className="absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all" style={{ left: rule.enabled ? "1rem" : "0.125rem" }} />
                  </button>
                </div>
                {/* Actions */}
                <div className="w-14 flex items-center gap-1.5 justify-end">
                  <button onClick={() => startEdit(rule)} className="p-1 rounded text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors" title="Edit">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button onClick={() => deleteRule(rule.id)} className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Delete">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Empty state */}
          {rules.length === 0 && !isAdding && (
            <div className="px-4 py-10 text-center">
              <Bell className="w-8 h-8 text-slate-200 mx-auto mb-2" />
              <p className="text-xs text-slate-400">No health rules configured yet</p>
            </div>
          )}

          {/* Inline add form */}
          {isAdding && (
            <div className="px-4 py-3 bg-teal-50/30 flex items-center gap-4">
              {/* Metric */}
              <select
                value={draft.metric ?? "null_pct"}
                onChange={e => setDraft(prev => ({ ...prev, metric: e.target.value as HealthRule["metric"] }))}
                className="flex-1 px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
              >
                {METRIC_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {/* Operator */}
              <select
                value={draft.operator ?? ">="}
                onChange={e => setDraft(prev => ({ ...prev, operator: e.target.value as HealthRule["operator"] }))}
                className="w-20 px-2 py-1.5 rounded-lg border border-slate-200 text-xs text-center font-mono bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
              >
                {OPERATOR_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {/* Threshold */}
              <input
                value={draft.threshold ?? ""}
                onChange={e => setDraft(prev => ({ ...prev, threshold: e.target.value }))}
                placeholder="e.g. 5"
                className="w-20 px-2 py-1.5 rounded-lg border border-slate-200 text-xs text-center font-mono bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
              {/* Receivers */}
              <div className="flex-1 relative">
                <div className="flex flex-wrap gap-1 mb-1">
                  {(draft.receivers ?? []).map(email => (
                    <span key={email} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white text-[10px] text-slate-600 border border-slate-200">
                      {email}
                      <button onClick={() => removeReceiver(email)} className="text-slate-400 hover:text-red-500">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="relative">
                  <input
                    value={receiverInput}
                    onChange={e => { setReceiverInput(e.target.value); setShowReceiverDropdown(true); }}
                    onFocus={() => setShowReceiverDropdown(true)}
                    onKeyDown={handleReceiverKeyDown}
                    placeholder="Add email..."
                    className="w-full px-2 py-1 rounded border border-slate-200 text-[10px] bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                  {showReceiverDropdown && filteredReceivers.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 max-h-28 overflow-y-auto">
                      {filteredReceivers.map(r => (
                        <button
                          key={r}
                          onClick={() => { setReceiverInput(r); addReceiver(); }}
                          className="w-full text-left px-2.5 py-1.5 text-[10px] text-slate-600 hover:bg-teal-50 font-mono"
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {/* Status toggle */}
              <div className="w-16 flex justify-center">
                <button
                  onClick={() => setDraft(prev => ({ ...prev, enabled: !(prev.enabled ?? true) }))}
                  className={`relative w-8 h-4 rounded-full transition-colors ${(draft.enabled ?? true) ? "bg-teal-500" : "bg-slate-200"}`}
                >
                  <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${(draft.enabled ?? true) ? "left-4" : "left-0.5"}`} />
                </button>
              </div>
              {/* Actions */}
              <div className="w-14 flex items-center gap-1.5 justify-end">
                <button onClick={saveRule} className="p-1 rounded text-teal-600 hover:bg-teal-100 transition-colors" title="Save">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={cancelEdit} className="p-1 rounded text-slate-400 hover:bg-slate-100 transition-colors" title="Cancel">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add rule button */}
      {!isAdding && (
        <button
          onClick={startAdd}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border-2 border-dashed border-slate-300 text-[12px] text-slate-500 hover:border-teal-400 hover:text-teal-600 transition-colors bg-white"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Rule
        </button>
      )}
    </div>
  );
}
