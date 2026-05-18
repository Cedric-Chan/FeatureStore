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

// ─── Mock data builders ───────────────────────────────────────────────────────
function buildMockHealthSignals(featureName: string): HealthSignal[] {
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
      id: "h-3", stage: "dwd.user_credit_30d_features → risk_db.user_risk_score_ods",
      stageType: "ads", path: "training", signalType: "drift", severity: "warning",
      summary: "risk_score distribution shift detected",
      detail: `Column risk_score mean shifted from 612.3 (7d avg) to 688.7 (+12.5%). P95 increased from 921 to 952. Distribution is right-skewed; possible underlying event pattern change.`,
      value: "+12.5%", baseline: "7d avg 612.3", updatedAt: now,
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
             )) AS ${featureName}
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
FROM TABLE(TUMBLE(TABLE credit_events_src,
     DESCRIPTOR(event_ts), INTERVAL '1' MINUTE));`,
      dataverseUrl: "#",
    },
    {
      id: "p-s-3", order: 3,
      taskName: "FG Serving Canvas · credit_hbase_user_risk · ID · V1",
      path: "serving", stageLabel: "FG Serving Canvas",
      inputAssets: ["hbase.user_risk:cf:risk_score_raw (via FeatureSource)"],
      outputAsset: `feature: ${featureName}`,
      language: "Groovy",
      description: `在线 Serving 阶段：通过 HBase FeatureSource 扫描获取 raw value，经 Groovy Transformer 进行黑名单过滤和分数裁剪，产出最终 online Fine Feature。`,
      reviewStatus: "AI-KAG",
      snippet: `// FG Serving Canvas — Groovy region script (ID · V1)
def raw = HBaseCall.query(
    tableName: "user_risk",
    rowKey: input.user_id,
    qualifier: "cf:risk_score_raw"
)

if (raw == null || raw.risk_score_raw == null) {
    output.risk_score = -1
    return
}

def score = raw.risk_score_raw as int

if (input.is_blacklisted) {
    output.risk_score = 999
    return
}

output.risk_score = Math.max(300, Math.min(900, score))`,
    },
  ];
}


// ─── Severity config ──────────────────────────────────────────────────────────
const SEVERITY_STYLE: Record<string, { cls: string; icon: React.ReactNode }> = {
  critical: { cls: "bg-red-50 text-red-700 border-red-200",  icon: <AlertTriangle className="w-3 h-3" /> },
  warning:  { cls: "bg-amber-50 text-amber-700 border-amber-200", icon: <TrendingUp className="w-3 h-3" /> },
  ok:       { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="w-3 h-3" /> },
};


const REVIEW_STYLE: Record<string, { cls: string; icon: React.ReactNode }> = {
  "AI-KAG": { cls: "bg-teal-50 text-teal-700 border-teal-200", icon: <Sparkles className="w-3 h-3" /> },
};


const TASK_TYPE_STYLE: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  SparkBatch:      { label: "Spark Batch",      cls: "bg-blue-50 text-blue-700 border-blue-200",       icon: <Layers className="w-3 h-3" /> },
  FlinkStream:     { label: "Flink Stream",     cls: "bg-violet-50 text-violet-700 border-violet-200", icon: <Zap className="w-3 h-3" /> },
  HiveETL:         { label: "Hive ETL",         cls: "bg-amber-50 text-amber-700 border-amber-200",    icon: <Database className="w-3 h-3" /> },
  FGServingCanvas: { label: "FG Serving Canvas",cls: "bg-teal-50 text-teal-700 border-teal-300",       icon: <Code2 className="w-3 h-3" /> },
};

// ─── Mock lineage DAG ─────────────────────────────────────────────────────────
const MOCK_LINEAGE_EDGES = [
  { from: "ods.user_credit_events", to: "dwd.user_credit_30d_features", label: "Spark Batch" },
  { from: "dwd.user_credit_30d_features", to: "risk_db.user_risk_score_ods", label: "Spark Batch" },
  { from: "kafka.credit_events", to: "stream.credit_events_enriched", label: "Flink Stream" },
  { from: "stream.credit_events_enriched", to: "hbase.user_risk:cf", label: "Flink Stream" },
  { from: "hbase.user_risk:cf", to: "FeatureSource credit_hbase_user_risk", label: "HBase Scan" },
  { from: "FeatureSource credit_hbase_user_risk", to: "FG Serving Canvas", label: "Groovy V1" },
];

const UPSTREAM_NODES = [
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

const NODE_STYLE: Record<string, string> = {
  source: "border-slate-300 bg-slate-50 text-slate-700",
  hive: "border-amber-300 bg-amber-50 text-amber-800",
  kafka: "border-violet-300 bg-violet-50 text-violet-800",
  flink: "border-blue-300 bg-blue-50 text-blue-800",
  hbase: "border-teal-300 bg-teal-50 text-teal-800",
  fs: "border-emerald-300 bg-emerald-50 text-emerald-800",
  fg: "border-teal-500 bg-teal-100 text-teal-800 border-2",
  feature: "border-teal-600 bg-teal-600 text-white border-2 shadow-md shadow-teal-200",
};

// ─── Main Modal Component ─────────────────────────────────────────────────────
type LogicTab = "lineage" | "processing" | "health";

export function FeatureLogicModal({
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
  const [tab, setTab] = useState<LogicTab>("lineage");

  const healthSignals = useMemo(() => buildMockHealthSignals(featureName), [featureName]);
  const processingStages = useMemo(() => buildMockProcessingStages(featureName), [featureName]);

  useEffect(() => {
    if (!open) return;
    setTab("lineage");
  }, [open, featureName]);

  const criticalCount = healthSignals.filter((s) => s.severity === "critical").length;
  const warningCount = healthSignals.filter((s) => s.severity === "warning").length;
  const healthSummary =
    criticalCount > 0
      ? `${criticalCount} critical`
      : warningCount > 0
        ? `${warningCount} warning`
        : "all healthy";

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
              <h2 className="text-slate-800 text-base font-semibold tracking-tight">Feature Logic</h2>
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
            subtitle="Upstream DAG"
          />
          <TabBtn
            active={tab === "processing"}
            onClick={() => setTab("processing")}
            icon={<FileText className="w-3.5 h-3.5" />}
            label="Processing"
            subtitle="Stage-by-stage logic"
          />
          <TabBtn
            active={tab === "health"}
            onClick={() => setTab("health")}
            icon={<Activity className="w-3.5 h-3.5" />}
            label="Health"
            subtitle={healthSummary}
            badge={
              warningCount > 0
                ? { count: warningCount, color: "bg-amber-500" }
                : undefined
            }
          />
        </div>

        {/* ─── Body ─── */}
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }} className="flex-1 overflow-y-auto">
          {tab === "lineage" && <LineageTabContent featureName={featureName} />}
          {tab === "processing" && (
            <ProcessingTabContent stages={processingStages} featureName={featureName} />
          )}
          {tab === "health" && (
            <HealthTabContent signals={healthSignals} featureName={featureName} hasTraining={hasTraining} hasServing={hasServing} />
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

const COLUMNS = 4;

function chunkNodes(nodes: typeof UPSTREAM_NODES, cols: number) {
  const chunks: typeof UPSTREAM_NODES[] = [];
  for (let i = 0; i < nodes.length; i += cols) {
    chunks.push(nodes.slice(i, i + cols));
  }
  return chunks;
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

// ─── Tab 1: Lineage (Snake Layout) ────────────────────────────────────────────
function LineageTabContent({ featureName }: { featureName: string }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Merge Training → Serving → Terminal into one flow
  const flowNodes = [...TRAINING_NODES, ...SERVING_NODES, ...(TERMINAL_NODE ? [TERMINAL_NODE] : [])];
  const rows = chunkNodes(flowNodes, COLUMNS);

  const selectedNode = UPSTREAM_NODES.find((n) => n.id === selectedId);

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
              {idx < TRAINING_NODES.length - 1 && (
                <FlowArrow />
              )}
            </motion.div>
          ))}
          {/* Fill remaining slots so grid aligns */}
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
              {idx < SERVING_NODES.length - 1 && (
                <FlowArrow />
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

      {/* Selected node detail */}
      {selectedNode && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 mx-auto max-w-2xl p-4 rounded-xl border border-teal-200 bg-teal-50/50"
        >
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-xs font-mono text-teal-700 font-semibold">
              {selectedNode.label}
            </span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${NODE_STYLE[selectedNode.type] ? '' : 'bg-teal-100 text-teal-700 border-teal-200'}`}
              style={NODE_STYLE[selectedNode.type] ? undefined : {}}>
              {selectedNode.type}
            </span>
            {selectedNode.type === "source" || selectedNode.type === "hive" ? (
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">Training</span>
            ) : selectedNode.type !== "feature" ? (
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-violet-50 text-violet-700 border border-violet-200">Serving</span>
            ) : null}
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            {selectedId === "feature"
              ? `Terminal fine feature. Consumed by downstream models and services via FeatureGroup. Both Training (offline Hive) and Serving (online HBase → Groovy) availability confirmed.`
              : selectedId === "fg"
                ? `Platform-internal node. FeatureSource ${featureName} → Groovy Transformer V1 → Fine Feature ${featureName}. Orchestrated by FeatureGroup serving canvas.`
                : selectedNode.type === "source" || selectedNode.type === "hive"
                  ? `Training path pipeline node. Managed by Unity Catalog. T+1 sync. Click through to DataVerse for full task details and DQC reports.`
                  : `Serving path pipeline node. Managed by Unity Catalog. T+1 sync. Click through to DataVerse for full task details and DQC reports.`}
          </p>
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
      className={`relative rounded-xl border px-3 py-2.5 text-xs transition-all text-center w-full ${
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

// ─── Tab 2: Processing ────────────────────────────────────────────────────────

const PATH_CONFIG: Record<string, {
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  accentBg: string; accentBorder: string; accentText: string;
  stepBg: string; stepText: string;
  cardBorder: string; cardHover: string;
  headerBg: string;
  expandedBorder: string; expandedBg: string;
  codeBar: string;
  emptyIcon: React.ReactNode;
  emptyText: string;
}> = {
  training: {
    label: "Training Path",
    sublabel: "ODS binlog → Spark SQL → ADS · consumed by Batch Training API",
    icon: <Layers className="w-3.5 h-3.5" />,
    accentBg: "bg-emerald-50/60", accentBorder: "border-emerald-200", accentText: "text-emerald-700",
    stepBg: "bg-emerald-100", stepText: "text-emerald-700",
    cardBorder: "border-l-[3px] border-l-emerald-400 border-slate-200",
    cardHover: "hover:border-l-emerald-500 hover:shadow-sm",
    headerBg: "bg-emerald-50/30",
    expandedBorder: "border-emerald-200", expandedBg: "bg-emerald-50/20",
    codeBar: "bg-emerald-900",
    emptyIcon: <Layers className="w-8 h-8 text-emerald-300" />,
    emptyText: "No Training pipeline for this feature",
  },
  serving: {
    label: "Serving Path",
    sublabel: "Kafka → Flink SQL → HBase → FG Canvas · consumed by Serving API",
    icon: <Zap className="w-3.5 h-3.5" />,
    accentBg: "bg-violet-50/60", accentBorder: "border-violet-200", accentText: "text-violet-700",
    stepBg: "bg-violet-100", stepText: "text-violet-700",
    cardBorder: "border-l-[3px] border-l-violet-400 border-slate-200",
    cardHover: "hover:border-l-violet-500 hover:shadow-sm",
    headerBg: "bg-violet-50/30",
    expandedBorder: "border-violet-200", expandedBg: "bg-violet-50/20",
    codeBar: "bg-violet-900",
    emptyIcon: <Zap className="w-8 h-8 text-violet-300" />,
    emptyText: "No Serving pipeline for this feature",
  },
};

function ProcessingTabContent({
  stages,
  featureName,
}: {
  stages: ProcessingStage[];
  featureName: string;
}) {
  const trainingStages = stages.filter((s) => s.path === "training");
  const servingStages  = stages.filter((s) => s.path === "serving");

  return (
    <div className="px-4 sm:px-6 py-5 space-y-5">
      <div className="flex items-center gap-2 text-[11px] text-slate-400 uppercase tracking-wider">
        <FileText className="w-3 h-3 text-teal-500" />
        <span>AI-distilled processing logic for</span>
        <span className="font-mono text-teal-600 normal-case tracking-normal">{featureName}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <ProcessingPathColumn
          path="training"
          stages={trainingStages}
          featureName={featureName}
        />
        <ProcessingPathColumn
          path="serving"
          stages={servingStages}
          featureName={featureName}
        />
      </div>
    </div>
  );
}

function ProcessingPathColumn({
  path,
  stages,
  featureName,
}: {
  path: "training" | "serving";
  stages: ProcessingStage[];
  featureName: string;
}) {
  const cfg = PATH_CONFIG[path];

  return (
    <div className="space-y-3">
      <div className={`rounded-xl border ${cfg.accentBorder} ${cfg.accentBg} px-4 py-3`}>
        <div className="flex items-center gap-2 mb-1">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${cfg.accentBg} ${cfg.accentBorder} border ${cfg.accentText} text-[11px] font-semibold`}>
            <span className={`w-1.5 h-1.5 rounded-full ${path === "training" ? "bg-emerald-400" : "bg-violet-400"}`} />
            {cfg.label}
          </span>
        </div>
        <p className="text-[10px] text-slate-500 leading-relaxed">{cfg.sublabel}</p>
      </div>

      {stages.length > 0 ? (
        stages.map((stage) => (
          <ProcessingStageCard
            key={stage.id}
            stage={stage}
            section={path}
          />
        ))
      ) : (
        <div className={`rounded-xl border border-dashed ${cfg.accentBorder} ${cfg.accentBg} flex flex-col items-center justify-center py-10 px-4 text-center`}>
          {cfg.emptyIcon}
          <p className="text-xs text-slate-400 mt-2">{cfg.emptyText}</p>
        </div>
      )}
    </div>
  );
}

function ProcessingStageCard({
  stage,
  section,
}: {
  stage: ProcessingStage;
  section: "training" | "serving";
}) {
  const [isExpanded, setExpanded] = useState(false);
  const cfg = PATH_CONFIG[section];

  return (
    <motion.div
      layout
      className={`rounded-xl border overflow-hidden transition-all ${cfg.cardBorder} ${cfg.cardHover} bg-white`}
    >
      <button
        onClick={() => setExpanded(!isExpanded)}
        className={`w-full flex items-start justify-between px-4 py-3 text-left transition-colors ${cfg.headerBg} hover:bg-opacity-80`}
      >
        <div className="flex items-start gap-3 min-w-0">
          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg ${cfg.stepBg} ${cfg.stepText} text-[11px] font-bold flex-shrink-0 mt-0.5`}>
            {stage.order}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-slate-800">
                {stage.stageLabel}
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border bg-teal-50 text-teal-700 border-teal-200">
                <Sparkles className="w-3 h-3" />
                AI-KAG
              </span>
              <span className="text-[10px] text-slate-400 font-mono">{stage.language}</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
              {stage.description}
            </p>
            <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <Database className="w-2.5 h-2.5" />
                {stage.inputAssets.join(", ")}
              </span>
              <ArrowRight className="w-2.5 h-2.5 flex-shrink-0" />
              <span className="font-mono text-slate-600 truncate">{stage.outputAsset}</span>
            </div>
          </div>
        </div>
        <span className={`text-slate-300 transition-transform flex-shrink-0 ml-2 ${isExpanded ? "rotate-180" : ""}`}>
          ▼
        </span>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-slate-100 overflow-hidden"
          >
            <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] bg-slate-50/60">
              <div>
                <span className="text-slate-400 uppercase text-[10px] tracking-wider">Input</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {stage.inputAssets.map((a) => (
                    <span key={a} className="px-1.5 py-0.5 rounded bg-white text-slate-700 font-mono border border-slate-200 text-[10px]">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-slate-400 uppercase text-[10px] tracking-wider">Output</span>
                <div className="mt-1">
                  <span className="px-1.5 py-0.5 rounded bg-white text-slate-700 font-mono border border-slate-200 text-[10px]">
                    {stage.outputAsset}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-slate-400 uppercase text-[10px] tracking-wider">Language</span>
                <span className="block mt-1 text-slate-700 text-[11px]">{stage.language}</span>
                {stage.dataverseUrl && (
                  <a href={stage.dataverseUrl} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-0.5 text-teal-600 hover:text-teal-800 mt-0.5 text-[10px]">
                    View in DataVerse <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            </div>

            <div className={`px-4 py-3 border-b border-slate-100 ${cfg.expandedBg}`}>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 uppercase tracking-wide mb-1.5">
                <Brain className={`w-3 h-3 ${section === "training" ? "text-emerald-400" : "text-violet-400"}`} />
                AI Summary
              </div>
              <p className="text-[12px] text-slate-600 leading-relaxed">{stage.description}</p>
            </div>

            <div className={`${cfg.codeBar} text-slate-100 px-4 py-3 font-mono text-[11.5px] leading-relaxed overflow-x-auto`}>
              <div className="flex items-center gap-2 mb-2 text-[10px] uppercase tracking-wide text-slate-400">
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>AI-KAG · knowledge asset graph extracted by AI agent</span>
              </div>
              <pre className="whitespace-pre">{stage.snippet}</pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Health path colors ────────────────────────────────────────────────────────
const HEALTH_PATH: Record<string, {
  label: string; icon: React.ReactNode;
  accentBg: string; accentBorder: string; accentText: string; emptyIcon: React.ReactNode; emptyText: string;
}> = {
  training: {
    label: "Training", icon: <Layers className="w-3 h-3" />,
    accentBg: "bg-emerald-50/60", accentBorder: "border-emerald-200", accentText: "text-emerald-700",
    emptyIcon: <Activity className="w-8 h-8 text-emerald-300" />,
    emptyText: "No Training health signals",
  },
  serving: {
    label: "Serving", icon: <Zap className="w-3 h-3" />,
    accentBg: "bg-violet-50/60", accentBorder: "border-violet-200", accentText: "text-violet-700",
    emptyIcon: <Activity className="w-8 h-8 text-violet-300" />,
    emptyText: "No Serving health signals",
  },
};

function HealthTabContent({
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
  const tWarn = trainingSignals.filter((s) => s.severity === "warning").length;
  const tCrit = trainingSignals.filter((s) => s.severity === "critical").length;
  const sOk = servingSignals.filter((s) => s.severity === "ok").length;
  const sWarn = servingSignals.filter((s) => s.severity === "warning").length;
  const sCrit = servingSignals.filter((s) => s.severity === "critical").length;

  const summaryOk = tOk + sOk;
  const summaryWarn = tWarn + sWarn;
  const summaryCrit = tCrit + sCrit;

  return (
    <div className="px-4 sm:px-6 py-5 space-y-5">
      {/* Section label */}
      <div className="flex items-center gap-2 text-[11px] text-slate-400 uppercase tracking-wider">
        <Activity className="w-3 h-3 text-teal-500" />
        <span>Upstream pipeline health for</span>
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
            {summaryCrit > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" /> {summaryCrit} critical
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 ml-auto">
          {(["all", "warning", "critical"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilterSeverity(f)}
              className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors ${
                filterSeverity === f
                  ? "bg-white text-slate-700 border border-slate-300 shadow-sm"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {f === "all" ? "All" : f === "warning" ? "Warnings" : "Critical"}
            </button>
          ))}
        </div>
      </div>

      {/* Two parallel columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <HealthPathColumn path="training" signals={filteredTraining} hasPath={hasTraining} />
        <HealthPathColumn path="serving"  signals={filteredServing}  hasPath={hasServing}  />
      </div>
    </div>
  );
}

function HealthPathColumn({
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
            {cfg.label} Health
          </span>
        </div>
        <p className="text-[10px] text-slate-500 leading-relaxed mt-1">
          {path === "training"
            ? "Hive ODS/DWD/ADS pipeline · latency, drift, freshness"
            : "Kafka/Flink/HBase/FG pipeline · latency, freshness, serving"}
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
                      {signal.signalType === "latency" ? "Latency" : signal.signalType === "drift" ? "Drift" : signal.signalType === "freshness" ? "Freshness" : "OK"}
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
