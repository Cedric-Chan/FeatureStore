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
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type TaskType = "SparkBatch" | "FlinkStream" | "HiveETL";
type LogicLanguage = "SQL" | "Flink SQL" | "Python";

export interface FeatureLineageNode {
  id: string;
  taskName: string;
  taskType: TaskType;
  inputAssets: string[];
  outputAsset: string;
  ownerTeam: string;
  dataverseUrl: string;
  featureLogicSnippet: string; // AI-extracted, feature-relevant only
  logicLanguage: LogicLanguage;
  reviewStatus: "AI-Draft" | "Human-Reviewed" | "Auto-Merged";
}

export interface FeatureLineageChain {
  nodes: FeatureLineageNode[]; // in upstream → downstream order
}

export interface FeatureLineagePayload {
  featureName: string;
  training?: FeatureLineageChain;
  serving?: FeatureLineageChain;
}

// ─── Visual config ────────────────────────────────────────────────────────────
const TASK_TYPE_STYLE: Record<TaskType, { label: string; cls: string; icon: React.ReactNode }> = {
  SparkBatch:  { label: "Spark Batch",   cls: "bg-blue-50 text-blue-700 border-blue-200",     icon: <Layers className="w-3 h-3" /> },
  FlinkStream: { label: "Flink Stream",  cls: "bg-violet-50 text-violet-700 border-violet-200", icon: <Zap className="w-3 h-3" /> },
  HiveETL:     { label: "Hive ETL",      cls: "bg-amber-50 text-amber-700 border-amber-200",   icon: <Database className="w-3 h-3" /> },
};

const REVIEW_STYLE: Record<FeatureLineageNode["reviewStatus"], { cls: string; icon: React.ReactNode }> = {
  "AI-Draft":       { cls: "bg-sky-50 text-sky-700 border-sky-200",                 icon: <Sparkles className="w-3 h-3" /> },
  "Human-Reviewed": { cls: "bg-emerald-50 text-emerald-700 border-emerald-200",     icon: <ShieldCheck className="w-3 h-3" /> },
  "Auto-Merged":    { cls: "bg-teal-50 text-teal-700 border-teal-200",              icon: <CheckCircle2 className="w-3 h-3" /> },
};

// ─── Mock lineage payloads ────────────────────────────────────────────────────
const MOCK_FEATURE_LINEAGE: Record<string, FeatureLineagePayload> = {
  risk_score: {
    featureName: "risk_score",
    training: {
      nodes: [
        {
          id: "n-t-1",
          taskName: "ods_user_credit_events",
          taskType: "HiveETL",
          inputAssets: ["binlog.user_credit_events"],
          outputAsset: "ods.user_credit_events",
          ownerTeam: "dw-team",
          dataverseUrl: "#",
          logicLanguage: "SQL",
          reviewStatus: "Auto-Merged",
          featureLogicSnippet:
`-- Pass-through ingest: raw events that feed risk_score
SELECT user_id,
       event_type,
       amount,
       event_ts
FROM binlog.user_credit_events
WHERE dt = '\${dt}';`,
        },
        {
          id: "n-t-2",
          taskName: "dwd_user_credit_30d_agg",
          taskType: "SparkBatch",
          inputAssets: ["ods.user_credit_events"],
          outputAsset: "dwd.user_credit_30d_features",
          ownerTeam: "dw-team",
          dataverseUrl: "#",
          logicLanguage: "SQL",
          reviewStatus: "Human-Reviewed",
          featureLogicSnippet:
`-- AI-extracted: only fragments contributing to risk_score
SELECT user_id,
       SUM(CASE WHEN event_type='OVERDUE' THEN amount END) AS overdue_amt_30d,
       COUNT(CASE WHEN event_type='REPAY'  THEN 1 END)    AS repay_cnt_30d
FROM ods.user_credit_events
WHERE dt BETWEEN DATE_SUB('\${dt}',30) AND '\${dt}'
GROUP BY user_id;`,
        },
        {
          id: "n-t-3",
          taskName: "ads_user_risk_score_ods",
          taskType: "SparkBatch",
          inputAssets: ["dwd.user_credit_30d_features", "dim.user_meta"],
          outputAsset: "risk_db.user_risk_score_ods",
          ownerTeam: "risk-team",
          dataverseUrl: "#",
          logicLanguage: "SQL",
          reviewStatus: "AI-Draft",
          featureLogicSnippet:
`-- Final scoring step: column \`risk_score\`
SELECT user_id,
       LEAST(999,
             GREATEST(300,
                ROUND(600
                  + 1.5 * COALESCE(repay_cnt_30d,0)
                  - 0.8 * COALESCE(overdue_amt_30d,0)/100)
             )) AS risk_score
FROM dwd.user_credit_30d_features
WHERE dt = '\${dt}';`,
        },
      ],
    },
    serving: {
      nodes: [
        {
          id: "n-s-1",
          taskName: "credit_events_kafka_source",
          taskType: "FlinkStream",
          inputAssets: ["kafka.credit_events"],
          outputAsset: "stream.credit_events_enriched",
          ownerTeam: "realtime-team",
          dataverseUrl: "#",
          logicLanguage: "Flink SQL",
          reviewStatus: "Auto-Merged",
          featureLogicSnippet:
`CREATE TABLE credit_events_src (
  user_id STRING,
  event_type STRING,
  amount DECIMAL(18,2),
  event_ts TIMESTAMP(3),
  WATERMARK FOR event_ts AS event_ts - INTERVAL '5' SECOND
) WITH ('connector'='kafka', 'topic'='credit_events', ...);`,
        },
        {
          id: "n-s-2",
          taskName: "credit_risk_score_realtime",
          taskType: "FlinkStream",
          inputAssets: ["stream.credit_events_enriched"],
          outputAsset: "hbase.user_risk:risk_score",
          ownerTeam: "realtime-team",
          dataverseUrl: "#",
          logicLanguage: "Flink SQL",
          reviewStatus: "Human-Reviewed",
          featureLogicSnippet:
`-- AI-extracted: only the part writing \`risk_score\` to HBase
INSERT INTO user_risk_sink /* hbase.user_risk:risk_score */
SELECT user_id,
       LEAST(999,
             GREATEST(300,
                ROUND(600
                  + 1.5 * repay_cnt_30d_rt
                  - 0.8 * overdue_amt_30d_rt/100)
             )) AS risk_score
FROM TABLE(TUMBLE(TABLE credit_events_src, DESCRIPTOR(event_ts), INTERVAL '1' MINUTE));`,
        },
      ],
    },
  },
};

function getMockLineage(featureName: string): FeatureLineagePayload {
  const exact = MOCK_FEATURE_LINEAGE[featureName];
  if (exact) return exact;
  return {
    featureName,
    training: {
      nodes: [
        {
          id: "g-t-1", taskName: `ods_${featureName}_raw`, taskType: "HiveETL",
          inputAssets: [`binlog.${featureName}_src`], outputAsset: `ods.${featureName}_raw`,
          ownerTeam: "dw-team", dataverseUrl: "#", logicLanguage: "SQL", reviewStatus: "Auto-Merged",
          featureLogicSnippet:
`-- Raw ingest for ${featureName}
SELECT entity_id, raw_value, ds
FROM binlog.${featureName}_src
WHERE dt = '\${dt}';`,
        },
        {
          id: "g-t-2", taskName: `dwd_${featureName}_agg`, taskType: "SparkBatch",
          inputAssets: [`ods.${featureName}_raw`], outputAsset: `dwd.${featureName}_features`,
          ownerTeam: "dw-team", dataverseUrl: "#", logicLanguage: "SQL", reviewStatus: "Human-Reviewed",
          featureLogicSnippet:
`-- AI-extracted: derivation of ${featureName}
SELECT entity_id,
       /* feature: ${featureName} */
       AVG(raw_value) AS ${featureName}
FROM ods.${featureName}_raw
WHERE dt BETWEEN DATE_SUB('\${dt}',7) AND '\${dt}'
GROUP BY entity_id;`,
        },
      ],
    },
    serving: {
      nodes: [
        {
          id: "g-s-1", taskName: `${featureName}_stream`, taskType: "FlinkStream",
          inputAssets: [`kafka.${featureName}_events`], outputAsset: `hbase.feat:${featureName}`,
          ownerTeam: "realtime-team", dataverseUrl: "#", logicLanguage: "Flink SQL", reviewStatus: "AI-Draft",
          featureLogicSnippet:
`-- Realtime computation for ${featureName}
INSERT INTO feat_sink /* hbase.feat:${featureName} */
SELECT entity_id, /* feature: ${featureName} */ LAST_VALUE(raw_value) AS ${featureName}
FROM TABLE(TUMBLE(TABLE ${featureName}_events_src, DESCRIPTOR(event_ts), INTERVAL '1' MINUTE));`,
        },
      ],
    },
  };
}

// ─── Component ────────────────────────────────────────────────────────────────
export function FeatureLineageModal({
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
  const tabs = useMemo(() => {
    const t: Array<{ key: "training" | "serving"; label: string }> = [];
    if (hasTraining) t.push({ key: "training", label: "Training" });
    if (hasServing)  t.push({ key: "serving",  label: "Serving"  });
    return t;
  }, [hasTraining, hasServing]);

  const [tab, setTab] = useState<"training" | "serving">(tabs[0]?.key ?? "training");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTab(tabs[0]?.key ?? "training");
    setSelectedId(null);
  }, [open, featureName, tabs]);

  const payload = useMemo(() => getMockLineage(featureName), [featureName]);
  const chain = tab === "training" ? payload.training : payload.serving;

  const effectiveSelected = useMemo(() => {
    if (!chain || chain.nodes.length === 0) return null;
    if (selectedId) {
      const found = chain.nodes.find((n) => n.id === selectedId);
      if (found) return found;
    }
    return chain.nodes[chain.nodes.length - 1];
  }, [chain, selectedId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-5xl mx-4 max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500 flex items-center justify-center flex-shrink-0 shadow-sm shadow-teal-200 mt-0.5">
              <GitBranch className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-slate-800 text-base font-semibold">Feature Logic</h2>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">
                <span className="text-teal-700">{featureName}</span>
                <span className="mx-1.5 text-slate-300">·</span>
                <span className="text-slate-500">Upstream pipeline DAG · AI-extracted logic</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 px-6 flex-shrink-0">
          {tabs.map((t) => {
            const c = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); setSelectedId(null); }}
                className={`relative flex items-center gap-1.5 px-1 py-3 mr-7 text-sm transition-colors ${c ? "text-teal-600" : "text-slate-500 hover:text-slate-700"}`}
              >
                {t.label}
                {c && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-500 rounded-full" />}
              </button>
            );
          })}
          {tabs.length === 0 && (
            <span className="py-3 text-sm text-slate-400">No availability for this feature</span>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {chain && chain.nodes.length > 0 ? (
            <>
              {/* DAG row */}
              <div className="px-6 pt-5 pb-4 bg-gradient-to-b from-slate-50/40 to-white">
                <div className="text-[11px] uppercase tracking-wide text-slate-400 mb-3 flex items-center gap-1.5">
                  <span>Upstream pipeline DAG</span>
                  <span className="text-slate-300">·</span>
                  <span className="text-slate-400">click a node to inspect feature-relevant logic</span>
                </div>
                <div className="flex items-stretch gap-2 overflow-x-auto pb-2">
                  {chain.nodes.map((n, idx) => {
                    const isSel = effectiveSelected?.id === n.id;
                    const ts = TASK_TYPE_STYLE[n.taskType];
                    return (
                      <div key={n.id} className="flex items-stretch gap-2">
                        <button
                          onClick={() => setSelectedId(n.id)}
                          className={`min-w-[200px] text-left rounded-xl border px-3.5 py-3 transition-all ${
                            isSel
                              ? "border-teal-500 bg-teal-50/60 shadow-sm shadow-teal-100"
                              : "border-slate-200 bg-white hover:border-teal-300 hover:bg-slate-50/60"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${ts.cls}`}>
                              {ts.icon}
                              {ts.label}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">#{idx + 1}</span>
                          </div>
                          <div className="text-xs font-mono text-slate-800 truncate" title={n.taskName}>{n.taskName}</div>
                          <div className="text-[10px] text-slate-400 font-mono truncate mt-1" title={n.outputAsset}>→ {n.outputAsset}</div>
                        </button>
                        {idx < chain.nodes.length - 1 && (
                          <div className="flex items-center px-0.5">
                            <ArrowRight className="w-4 h-4 text-slate-300" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {/* Final feature node */}
                  <div className="flex items-stretch gap-2">
                    <div className="flex items-center px-0.5">
                      <ArrowRight className="w-4 h-4 text-slate-300" />
                    </div>
                    <div className="min-w-[180px] rounded-xl border-2 border-dashed border-teal-400 bg-teal-50/40 px-3.5 py-3 flex flex-col justify-center">
                      <div className="text-[10px] uppercase tracking-wide text-teal-600 mb-0.5">Feature</div>
                      <div className="text-xs font-mono text-teal-700 truncate" title={featureName}>{featureName}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Selected node detail */}
              {effectiveSelected && (
                <div className="px-6 pb-6">
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    {/* Detail header */}
                    <div className="px-4 py-3 bg-slate-50/60 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${TASK_TYPE_STYLE[effectiveSelected.taskType].cls}`}>
                          {TASK_TYPE_STYLE[effectiveSelected.taskType].icon}
                          {TASK_TYPE_STYLE[effectiveSelected.taskType].label}
                        </span>
                        <span className="text-xs font-mono text-slate-800">{effectiveSelected.taskName}</span>
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${REVIEW_STYLE[effectiveSelected.reviewStatus].cls}`}>
                          {REVIEW_STYLE[effectiveSelected.reviewStatus].icon}
                          {effectiveSelected.reviewStatus}
                        </span>
                      </div>
                      <a
                        href={effectiveSelected.dataverseUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-teal-600 hover:text-teal-800"
                      >
                        View in DataVerse
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    {/* Detail body */}
                    <div className="px-4 py-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] border-b border-slate-100">
                      <div>
                        <div className="text-slate-400 uppercase tracking-wide text-[10px] mb-1">Input</div>
                        <div className="flex flex-wrap gap-1">
                          {effectiveSelected.inputAssets.map((a) => (
                            <span key={a} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono border border-slate-200">{a}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-400 uppercase tracking-wide text-[10px] mb-1">Output</div>
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono border border-slate-200">{effectiveSelected.outputAsset}</span>
                      </div>
                      <div>
                        <div className="text-slate-400 uppercase tracking-wide text-[10px] mb-1">Owner</div>
                        <span className="text-slate-700">{effectiveSelected.ownerTeam}</span>
                      </div>
                      <div>
                        <div className="text-slate-400 uppercase tracking-wide text-[10px] mb-1">Language</div>
                        <span className="text-slate-700">{effectiveSelected.logicLanguage}</span>
                      </div>
                    </div>

                    {/* SQL snippet */}
                    <div className="bg-slate-900 text-slate-100 px-4 py-3 font-mono text-[11.5px] leading-relaxed overflow-x-auto">
                      <div className="flex items-center gap-2 mb-2 text-[10px] uppercase tracking-wide text-slate-400">
                        <Sparkles className="w-3 h-3 text-amber-300" />
                        <span>AI-extracted · only fragments related to <span className="text-teal-300">{featureName}</span></span>
                      </div>
                      <pre className="whitespace-pre">{effectiveSelected.featureLogicSnippet}</pre>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="px-6 py-12 text-center text-sm text-slate-400">
              No {tab} lineage available for this feature.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/40 text-[11px] text-slate-500 flex items-center justify-between flex-shrink-0">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-amber-500" />
            Logic extracted by AI agent · pending human review where marked <span className="px-1 rounded bg-sky-50 text-sky-700 border border-sky-200">AI-Draft</span>
          </span>
          <button onClick={onClose} className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-teal-400 hover:text-teal-600 transition-colors text-xs">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
