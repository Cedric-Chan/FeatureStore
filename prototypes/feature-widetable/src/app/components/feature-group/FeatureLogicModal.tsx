import { useEffect, useMemo, useState } from "react";
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
import {
  FeatureLineageNode,
  FeatureLineageChain,
  FeatureLineagePayload,
} from "./FeatureLineageModal";

// ─── Health signal types ──────────────────────────────────────────────────────
interface HealthSignal {
  id: string;
  stage: string;
  stageType: "ods" | "dwd" | "ads" | "kafka" | "hbase" | "fg";
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
  reviewStatus: "AI-Draft" | "Human-Reviewed" | "Auto-Merged";
  snippet: string;
  dataverseUrl?: string;
}

// ─── Mock data builders ───────────────────────────────────────────────────────
function buildMockHealthSignals(featureName: string): HealthSignal[] {
  const now = "2026-05-15 08:30";
  return [
    {
      id: "h-1", stage: "binlog.user_credit_events → ods.user_credit_events",
      stageType: "ods", signalType: "ok", severity: "ok",
      summary: "ODS ingestion on track",
      detail: "ods.user_credit_events daily partition dt=2026-05-14 completed at 03:22 UTC. 98.3M rows loaded, no schema changes detected.",
      value: "2026-05-14 03:22", baseline: "daily before 04:00", updatedAt: now,
    },
    {
      id: "h-2", stage: "ods.user_credit_events → dwd.user_credit_30d_features",
      stageType: "dwd", signalType: "latency", severity: "warning",
      summary: "DWD aggregation delayed by 1.5h",
      detail: "dwd.user_credit_30d_features dt=2026-05-14 completed at 05:48. Typical completion is 04:15 ± 30 min. Spark job queued longer than usual due to cluster contention.",
      value: "05:48 (+1.5h)", baseline: "~04:15", updatedAt: now,
    },
    {
      id: "h-3", stage: "dwd.user_credit_30d_features → risk_db.user_risk_score_ods",
      stageType: "ads", signalType: "drift", severity: "warning",
      summary: "risk_score distribution shift detected",
      detail: `Column risk_score mean shifted from 612.3 (7d avg) to 688.7 (+12.5%). P95 increased from 921 to 952. Distribution is right-skewed; possible underlying event pattern change.`,
      value: "+12.5%", baseline: "7d avg 612.3", updatedAt: now,
    },
    {
      id: "h-4", stage: "kafka.credit_events → stream.credit_events_enriched",
      stageType: "kafka", signalType: "ok", severity: "ok",
      summary: "Kafka stream healthy",
      detail: "Topic credit_events: consumer lag 120ms, throughput 8.4K msg/s. No message loss or duplication detected in last 24h.",
      value: "lag 120ms", baseline: "< 500ms", updatedAt: now,
    },
    {
      id: "h-5", stage: "stream → hbase.user_risk:cf:risk_score_raw",
      stageType: "hbase", signalType: "freshness", severity: "ok",
      summary: "HBase write freshness OK",
      detail: "hbase.user_risk table: latest write at 08:29:45 UTC. 99.7% of writes within 2s of Kafka event time. No TTL eviction spikes.",
      value: "2s behind", baseline: "< 5s", updatedAt: now,
    },
    {
      id: "h-6", stage: `FG Serving Canvas → feature: ${featureName}`,
      stageType: "fg", signalType: "ok", severity: "ok",
      summary: "Feature serving latency normal",
      detail: `FG serving p99 = 182ms (HBase scan 96ms + Groovy transform 86ms). Call volume 12.3K/min. Zero errors in last hour.`,
      value: "p99 182ms", baseline: "< 500ms", updatedAt: now,
    },
  ];
}

function buildMockProcessingStages(featureName: string): ProcessingStage[] {
  return [
    {
      id: "p-1", order: 1,
      taskName: "ods_user_credit_events",
      stageLabel: "Stage 1 — Raw Ingestion",
      inputAssets: ["binlog.user_credit_events"],
      outputAsset: "ods.user_credit_events",
      language: "SQL (Hive ETL)",
      description: "从上游 binlog 层全量导入用户信用事件原始数据，按 dt 分区落表。此阶段为 pass-through，不做任何业务加工，保留全部字段与事件时间戳。",
      reviewStatus: "Auto-Merged",
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
      id: "p-2", order: 2,
      taskName: "dwd_user_credit_30d_agg",
      stageLabel: "Stage 2 — 30-Day Aggregation",
      inputAssets: ["ods.user_credit_events"],
      outputAsset: "dwd.user_credit_30d_features",
      language: "SQL (Spark Batch)",
      description: "对近 30 天信用事件按用户维度聚合，计算逾期金额和还款次数两个中间特征，作为后续评分的输入因子。",
      reviewStatus: "Human-Reviewed",
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
      id: "p-3", order: 3,
      taskName: "ads_user_risk_score_ods",
      stageLabel: "Stage 3 — Final Scoring",
      inputAssets: ["dwd.user_credit_30d_features", "dim.user_meta"],
      outputAsset: `risk_db.user_risk_score_ods → ${featureName}`,
      language: "SQL (Spark Batch)",
      description: `将中间聚合特征加权计算，产出最终特征列 ${featureName}。通过 LEAST/GREATEST 进行分数裁剪，确保值域在 300–999 之间。`,
      reviewStatus: "AI-Draft",
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
      id: "p-4", order: 4,
      taskName: "FG Serving Canvas · credit_hbase_user_risk · ID · V1",
      stageLabel: "Stage 4 — Online Serving",
      inputAssets: ["hbase.user_risk:cf:risk_score_raw (via FeatureSource)"],
      outputAsset: `feature: ${featureName}`,
      language: "Groovy (FG Serving Canvas)",
      description: `在线 Serving 阶段：通过 HBase FeatureSource 扫描获取 raw value，经 Groovy Transformer 进行黑名单过滤和分数裁剪，产出最终 online Fine Feature。`,
      reviewStatus: "Human-Reviewed",
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

// Filter: treat blacklisted users as highest risk
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
  "AI-Draft":       { cls: "bg-sky-50 text-sky-700 border-sky-200",             icon: <Sparkles className="w-3 h-3" /> },
  "Human-Reviewed": { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <ShieldCheck className="w-3 h-3" /> },
  "Auto-Merged":    { cls: "bg-teal-50 text-teal-700 border-teal-200",          icon: <CheckCircle2 className="w-3 h-3" /> },
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
            <HealthTabContent signals={healthSignals} featureName={featureName} />
          )}
        </div>

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
function LineageTabContent({ featureName }: { featureName: string }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div>
      {/* DAG visualization */}
      <div className="px-6 pt-5 pb-3">
        <div className="text-[11px] uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-1.5">
          <span>From raw data to fine feature</span>
          <span className="text-slate-300">·</span>
          <span className="text-slate-400">full pipeline topology</span>
        </div>

        {/* Horizontal DAG */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-4 px-1">
              {UPSTREAM_NODES.map((node, idx) => (
              <motion.div key={node.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.06, duration: 0.25 }} className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => setSelectedId(selectedId === node.id ? null : node.id)}
                className={`rounded-xl border px-3.5 py-2.5 text-xs transition-all text-center min-w-[100px] ${
                  NODE_STYLE[node.type] || "border-slate-200 bg-white text-slate-600"
                } ${
                  selectedId === node.id
                    ? "ring-2 ring-teal-400 ring-offset-1 scale-105 shadow-md"
                    : "hover:shadow-sm hover:scale-[1.03]"
                }`}
                style={{ whiteSpace: "pre-line" }}
              >
                {node.label}
              </button>
              {idx < UPSTREAM_NODES.length - 1 && (
                <ArrowRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Selected node detail */}
      {selectedId && (
        <div className="mx-6 mb-6 p-4 rounded-xl border border-teal-200 bg-teal-50/40">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono text-teal-700 font-semibold">
              {UPSTREAM_NODES.find((n) => n.id === selectedId)?.label}
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-teal-100 text-teal-700 border border-teal-200 font-medium">
              {UPSTREAM_NODES.find((n) => n.id === selectedId)?.type}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            {selectedId === "feature"
              ? `Terminal fine feature. Consumed by downstream models and services via FeatureGroup. Both Training (offline Hive) and Serving (online HBase → Groovy) availability confirmed.`
              : selectedId === "fg"
                ? `Platform-internal node. FeatureSource ${featureName} → Groovy Transformer V1 → Fine Feature ${featureName}. Orchestrated by FeatureGroup serving canvas.`
                : `External pipeline node managed by Unity Catalog. Metadata synced T+1. Click through to DataVerse for full task details and DQC reports.`}
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="mx-6 mb-5 flex flex-wrap gap-2 text-[10px]">
        <span className="flex items-center gap-1 text-slate-400">
          <span className="w-2.5 h-2.5 rounded border border-slate-300 bg-slate-50" /> External source
        </span>
        <span className="flex items-center gap-1 text-slate-400">
          <span className="w-2.5 h-2.5 rounded border border-amber-300 bg-amber-50" /> Hive table
        </span>
        <span className="flex items-center gap-1 text-slate-400">
          <span className="w-2.5 h-2.5 rounded border border-violet-300 bg-violet-50" /> Kafka topic
        </span>
        <span className="flex items-center gap-1 text-slate-400">
          <span className="w-2.5 h-2.5 rounded border border-teal-300 bg-teal-50" /> HBase/flink
        </span>
        <span className="flex items-center gap-1 text-slate-400">
          <span className="w-2.5 h-2.5 rounded border-2 border-teal-600 bg-teal-600" /> Fine Feature
        </span>
      </div>
    </div>
  );
}

// ─── Tab 2: Processing ────────────────────────────────────────────────────────
function ProcessingTabContent({
  stages,
  featureName,
}: {
  stages: ProcessingStage[];
  featureName: string;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(stages[0]?.id ?? null);

  return (
    <div className="px-6 py-5 space-y-4">
      <div className="text-[11px] uppercase tracking-wider text-slate-400 mb-1">
        AI-distilled · stage-by-stage derivation of{" "}
        <span className="font-mono text-teal-600">{featureName}</span>
      </div>

      {stages.map((stage) => {
        const isExpanded = expandedId === stage.id;
        const review = REVIEW_STYLE[stage.reviewStatus];

        return (
          <div
            key={stage.id}
            className="rounded-xl border border-slate-200 overflow-hidden transition-shadow hover:shadow-sm"
          >
            {/* Stage header — clickable */}
            <button
              onClick={() => setExpandedId(isExpanded ? null : stage.id)}
              className="w-full flex items-start justify-between px-4 py-3 text-left hover:bg-slate-50/60 transition-colors"
            >
              <div className="flex items-start gap-3 min-w-0">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-teal-100 text-teal-700 text-xs font-bold flex-shrink-0 mt-0.5">
                  {stage.order}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-800">
                      {stage.stageLabel}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${review.cls}`}>
                      {review.icon}
                      {stage.reviewStatus}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                    {stage.description}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Database className="w-2.5 h-2.5" />
                      {stage.inputAssets.join(", ")} → {stage.outputAsset}
                    </span>
                    <span>{stage.language}</span>
                  </div>
                </div>
              </div>
              <span className={`text-slate-300 transition-transform flex-shrink-0 ml-2 ${isExpanded ? "rotate-180" : ""}`}>
                ▼
              </span>
            </button>

            {/* Expanded detail */}
            {isExpanded && (
              <div className="border-t border-slate-100">
                {/* IO summary */}
                <div className="px-4 py-3 grid grid-cols-3 gap-4 text-[11px] bg-slate-50/50">
                  <div>
                    <span className="text-slate-400 uppercase text-[10px]">Input</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {stage.inputAssets.map((a) => (
                        <span key={a} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono border border-slate-200 text-[10px]">
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase text-[10px]">Output</span>
                    <div className="mt-1">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono border border-slate-200 text-[10px]">
                        {stage.outputAsset}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase text-[10px]">Language</span>
                    <span className="block mt-1 text-slate-700">{stage.language}</span>
                    {stage.dataverseUrl && (
                      <a
                        href={stage.dataverseUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-0.5 text-teal-600 hover:text-teal-800 mt-0.5 text-[10px]"
                      >
                        View in DataVerse <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </div>

                {/* AI description */}
                <div className="px-4 py-3 border-b border-slate-100">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 uppercase tracking-wide mb-1.5">
                    <Brain className="w-3 h-3 text-teal-400" /> AI Summary
                  </div>
                  <p className="text-[12px] text-slate-600 leading-relaxed">
                    {stage.description}
                  </p>
                </div>

                {/* Code snippet */}
                <div className="bg-slate-900 text-slate-100 px-4 py-3 font-mono text-[11.5px] leading-relaxed overflow-x-auto">
                  <div className="flex items-center gap-2 mb-2 text-[10px] uppercase tracking-wide text-slate-400">
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    <span>
                      {stage.reviewStatus === "AI-Draft"
                        ? "AI-Draft · pending human review"
                        : stage.reviewStatus === "Human-Reviewed"
                          ? "Human-reviewed · verified logic"
                          : "Auto-merged · high confidence match"}
                    </span>
                  </div>
                  <pre className="whitespace-pre">{stage.snippet}</pre>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Tab 3: Health ────────────────────────────────────────────────────────────
function HealthTabContent({
  signals,
  featureName,
}: {
  signals: HealthSignal[];
  featureName: string;
}) {
  const [filterSeverity, setFilterSeverity] = useState<"all" | "warning" | "critical">("all");

  const filtered = useMemo(() => {
    if (filterSeverity === "all") return signals;
    if (filterSeverity === "warning") return signals.filter((s) => s.severity === "warning" || s.severity === "critical");
    return signals.filter((s) => s.severity === "critical");
  }, [signals, filterSeverity]);

  const okCount = signals.filter((s) => s.severity === "ok").length;
  const warnCount = signals.filter((s) => s.severity === "warning").length;
  const critCount = signals.filter((s) => s.severity === "critical").length;

  return (
    <div className="px-6 py-5">
      {/* Summary bar */}
      <div className="flex items-center gap-3 mb-5 p-3 rounded-xl bg-slate-50 border border-slate-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
            <Activity className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <div className="text-xs text-slate-500">
              <span className="font-semibold text-slate-700">{featureName}</span> pipeline health
            </div>
            <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> {okCount} OK
              </span>
              {warnCount > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> {warnCount} warning
                </span>
              )}
              {critCount > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" /> {critCount} critical
                </span>
              )}
            </div>
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

      {/* Signal cards */}
      <div className="space-y-3">
        {filtered.map((signal) => {
          const sev = SEVERITY_STYLE[signal.severity];
          return (
            <div
              key={signal.id}
              className={`rounded-xl border p-4 transition-shadow hover:shadow-sm ${
                signal.severity === "critical"
                  ? "border-red-200 bg-red-50/30"
                  : signal.severity === "warning"
                    ? "border-amber-200 bg-amber-50/20"
                    : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${sev.cls} flex-shrink-0`}>
                    {sev.icon}
                    {signal.signalType === "latency" ? "Latency" : signal.signalType === "drift" ? "Drift" : signal.signalType === "freshness" ? "Freshness" : "OK"}
                  </span>
                  <div className="min-w-0">
                    <div className="text-[12px] font-semibold text-slate-800">
                      {signal.summary}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate" title={signal.stage}>
                      {signal.stage}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed max-w-2xl">
                      {signal.detail}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={`text-[12px] font-mono font-bold ${
                    signal.severity === "critical" ? "text-red-600" : signal.severity === "warning" ? "text-amber-600" : "text-emerald-600"
                  }`}>
                    {signal.value}
                  </span>
                  <span className="text-[9px] text-slate-400">
                    baseline: {signal.baseline}
                  </span>
                  <span className="text-[9px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {signal.updatedAt}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
