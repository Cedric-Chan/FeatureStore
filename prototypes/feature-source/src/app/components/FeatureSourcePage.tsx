import { useState, useEffect, useRef, Fragment } from "react";
import {
  Search,
  RotateCcw,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  ChevronDown,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  ChevronRight,
  AlertTriangle,
  X,
  Trash2,
  Link2,
  CheckCircle2,
  XCircle,
  ToggleLeft,
  Code2,
  FlaskConical,
  Play,
  Copy,
  FileEdit,
  Eye,
  Columns3,
  GitBranch,
  Zap,
  Database,
  ExternalLink,
  Users,
  Clock,
  CalendarClock,
  Unlink,
  Mail,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type SubStatus = "DRAFT" | "ENABLE" | "DISABLE";

interface ParamRow {
  name: string;
  dataType: string;
}

interface SubRow {
  id: string;
  region: string;
  version: string;
  scriptType: string;
  callFunction: string;
  inputParams: ParamRow[];
  outputParams: ParamRow[];
  status: SubStatus;
  updateTime: string;
  sourcePipeline: "Healthy" | "Warning" | "No Records";
}

interface FeatureRow {
  id: string;
  featureSource: string;
  sourceType: string;
  dataLatency: string;
  regions: string[];
  creator: string;
  createTime: string;
  description: string;
  subRows: SubRow[];
}

interface ModalState {
  open: boolean;
  type: "warning" | "error" | "info";
  title: string;
  body: React.ReactNode;
}

type RegionFormMode = "add" | "edit" | "copy";

interface MetaFormData {
  featureSource: string;
  sourceType: string;
  dataLatency: string;
  description: string;
}

interface RegionFormData {
  region: string;
  version: string;
  scriptType: string;
  callFunction: string;
  inputParams: ParamRow[];
  outputParams: ParamRow[];
}

interface UpstreamPipeline {
  id: string;
  name: string;
  type: "Spark Batch" | "Flink Streaming" | "Airflow DAG";
  sourceTable: string;
  health: "Healthy" | "Warning" | "Error";
  syncStatus: "In Sync" | "Lagging" | "Failed";
  lastSuccess: string;
  schedule: string;
  ownerEmail: string;
  lag?: string;
  dataverseSync: "In Sync" | "Not Found";
}

interface UsedByEntry {
  id: string;
  name: string;
  model: string;
  team: string;
  status: "Active" | "Deprecated";
  dailyQps: number;
  owner: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DATA_TYPES = ["string", "int", "long", "double", "float", "boolean", "list", "map", "json"];
const SCRIPT_TYPES = ["Groovy", "Python", "SQL", "Shell"];

const p = (name: string, dataType = "string"): ParamRow => ({ name, dataType });

const GS = {
  hbase_id: `def url = "https://hbase.internal/credit_user_risk_id/query"\ndef body = [\n    user_id: input.user_id,\n    id_card_no: input.id_card_no,\n    platform_user_id: input.platform_user_id\n]\ndef response = hbase.query(url, body)\nreturn [\n    raw_map: response.data,\n    risk_score: response.risk_score as int\n]`,
  hbase_th: `def url = "https://hbase.internal/credit_user_risk_th/query"\ndef body = [\n    user_id: input.user_id\n]\ndef response = hbase.query(url, body)\nreturn [\n    raw_map: response.data,\n    data_status: response.data_status as int\n]`,
  grpc_mx:  `def url = "https://grpc.internal/acard_realtime_mx/predict"\ndef body = [\n    id_card_no: input.id_card_no,\n    platform_user_id: input.platform_user_id,\n    phone_number: input.phone_number\n]\ndef response = grpc.call(url, body)\nreturn [\n    acard_score: response.acard_score as int,\n    acard_tier: response.acard_tier\n]`,
  grpc_id:  `def url = "https://grpc.internal/acard_realtime_id/predict"\ndef body = [\n    id_card_no: input.id_card_no,\n    platform_user_id: input.platform_user_id\n]\ndef response = grpc.call(url, body)\nreturn [\n    acard_score: response.acard_score as int,\n    acard_tier: response.acard_tier\n]`,
  redis_sg: `def key = "recommend:v2:sg:" + input.user_id + ":" + input.scene_id\ndef response = redis.hgetall(key)\nreturn [\n    item_list: response.item_list,\n    score_map: response.score_map\n]`,
  nebula_th:`def query = "FETCH PROP ON * \\\"" + input.user_id + "\\\""\ndef response = nebula.execute(query, [\n    depth: input.depth as int,\n    relation_type: input.relation_type\n])\nreturn [\n    node_list: response.nodes,\n    edge_list: response.edges,\n    relation_score: response.score as int\n]`,
};

const CF_TEMPLATE: Record<string, string> = {
  HBase:   GS.hbase_id,
  gRPC:    GS.grpc_mx,
  Redis:   GS.redis_sg,
  GraphDB: GS.nebula_th,
  MySQL:   `def url = "https://mysql.internal/query"\ndef body = [table: "feature_table", key: input.user_id]\ndef response = mysql.query(url, body)\nreturn [result: response.data]`,
  Kafka:   `def topic = "feature-topic-" + input.scene_id\ndef message = kafka.consume(topic, [key: input.user_id])\nreturn [result: message.value]`,
};

const INITIAL_DATA: FeatureRow[] = [
  {
    id: "1",
    featureSource: "credit_hbase_user_risk",
    sourceType: "HBase",
    dataLatency: "Nearline",
    regions: ["ID", "TH"],
    creator: "cedric.chencan@seamoney.com",
    createTime: "2026-02-16 13:31",
    description: "HBase-based user risk score features",
    subRows: [
      {
        id: "1-1", region: "ID", version: "V1", scriptType: "Groovy",
        callFunction: GS.hbase_id,
        inputParams: [p("user_id"), p("id_card_no"), p("platform_user_id")],
        outputParams: [p("raw_map", "map"), p("risk_score", "int")],
        status: "ENABLE", updateTime: "2026-02-16 14:00", sourcePipeline: "Healthy",
      },
      {
        id: "1-2", region: "TH", version: "V1", scriptType: "Groovy",
        callFunction: GS.hbase_th,
        inputParams: [p("user_id")],
        outputParams: [p("raw_map", "map"), p("data_status", "int")],
        status: "DRAFT", updateTime: "2026-02-15 10:30", sourcePipeline: "No Records",
      },
    ],
  },
  {
    id: "2",
    featureSource: "acard_grpc_realtime",
    sourceType: "gRPC",
    dataLatency: "Online",
    regions: ["MX", "ID"],
    creator: "zhengyi.loh@seamoney.com",
    createTime: "2026-02-13 15:36",
    description: "gRPC-based realtime Acard score",
    subRows: [
      {
        id: "2-1", region: "MX", version: "V2", scriptType: "Groovy",
        callFunction: GS.grpc_mx,
        inputParams: [p("id_card_no"), p("platform_user_id"), p("phone_number")],
        outputParams: [p("acard_score", "int"), p("acard_tier", "string")],
        status: "ENABLE", updateTime: "2026-02-14 18:45", sourcePipeline: "Warning",
      },
      {
        id: "2-2", region: "ID", version: "V1", scriptType: "Groovy",
        callFunction: GS.grpc_id,
        inputParams: [p("id_card_no"), p("platform_user_id")],
        outputParams: [p("acard_score", "int"), p("acard_tier", "string")],
        status: "DISABLE", updateTime: "2026-02-13 16:00", sourcePipeline: "Healthy",
      },
    ],
  },
  {
    id: "3",
    featureSource: "dp_redis_recommend",
    sourceType: "Redis",
    dataLatency: "Offline",
    regions: ["SHOPEE_SG"],
    creator: "huangwei@shopee.com",
    createTime: "2026-02-04 17:03",
    description: "Redis-backed recommendation features",
    subRows: [
      {
        id: "3-1", region: "SHOPEE_SG", version: "V1", scriptType: "Groovy",
        callFunction: GS.redis_sg,
        inputParams: [p("user_id"), p("scene_id")],
        outputParams: [p("item_list", "list"), p("score_map", "map")],
        status: "ENABLE", updateTime: "2026-02-05 09:20", sourcePipeline: "Healthy",
      },
    ],
  },
  {
    id: "4",
    featureSource: "graph_nebula_relations",
    sourceType: "GraphDB",
    dataLatency: "Nearline",
    regions: ["TH"],
    creator: "cedric.chencan@seamoney.com",
    createTime: "2026-02-13 13:00",
    description: "Graph DB relation features",
    subRows: [
      {
        id: "4-1", region: "TH", version: "V1", scriptType: "Groovy",
        callFunction: GS.nebula_th,
        inputParams: [p("user_id"), p("depth", "int"), p("relation_type")],
        outputParams: [p("node_list", "list"), p("edge_list", "list"), p("relation_score", "int")],
        status: "DISABLE", updateTime: "2026-02-12 22:10", sourcePipeline: "No Records",
      },
    ],
  },
];

const DOWNSTREAM_FEATURE_GROUPS: Record<string, string[]> = {
  "1-1": ["credit_score_v2_fg", "risk_model_online_fg"],
  "1-2": ["risk_th_realtime_fg"],
  "2-1": ["acard_mx_scoring_fg"],
  "2-2": ["acard_id_v3_fg", "credit_acard_combined_fg"],
  "3-1": ["recommend_shopee_sg_fg"],
  "4-1": ["graph_relation_th_fg"],
};

const MOCK_UPSTREAM_PIPELINES: Record<string, UpstreamPipeline[]> = {
  "1-1": [
    { id: "p1-1a", name: "credit_risk_etl_id",    type: "Spark Batch",     sourceTable: "ods.credit_user_id_raw",   health: "Healthy", syncStatus: "In Sync", lastSuccess: "2026-05-12 06:00:00", schedule: "0 6 * * *",   ownerEmail: "alice.wang@company.com",                  dataverseSync: "In Sync"   },
    { id: "p1-1b", name: "credit_risk_stream_id", type: "Flink Streaming", sourceTable: "kafka.credit_events_id",   health: "Healthy", syncStatus: "In Sync", lastSuccess: "2026-05-12 13:45:00", schedule: "Continuous",  ownerEmail: "bob.chen@company.com",   lag: "320 ms",  dataverseSync: "In Sync"   },
  ],
  "1-2": [
    { id: "p1-2a", name: "credit_risk_etl_th",    type: "Spark Batch",     sourceTable: "ods.credit_user_th_raw",   health: "Warning", syncStatus: "Lagging", lastSuccess: "2026-05-11 06:00:00", schedule: "0 6 * * *",   ownerEmail: "alice.wang@company.com",                  dataverseSync: "Not Found" },
  ],
  "2-1": [
    { id: "p2-1a", name: "acard_scoring_mx",       type: "Flink Streaming", sourceTable: "kafka.acard_events_mx",    health: "Healthy", syncStatus: "In Sync", lastSuccess: "2026-05-12 13:50:00", schedule: "Continuous",  ownerEmail: "carlos.li@company.com",  lag: "85 ms",   dataverseSync: "In Sync"   },
    { id: "p2-1b", name: "acard_feature_dag_mx",   type: "Airflow DAG",     sourceTable: "dwd.acard_mx_features",    health: "Healthy", syncStatus: "In Sync", lastSuccess: "2026-05-12 04:00:00", schedule: "0 */4 * * *", ownerEmail: "bob.chen@company.com",                    dataverseSync: "In Sync"   },
  ],
  "2-2": [
    { id: "p2-2a", name: "acard_scoring_id",       type: "Airflow DAG",     sourceTable: "ods.acard_id_raw",         health: "Error",   syncStatus: "Failed",  lastSuccess: "2026-05-10 06:00:00", schedule: "0 */4 * * *", ownerEmail: "carlos.li@company.com",                   dataverseSync: "Not Found" },
  ],
  "3-1": [
    { id: "p3-1a", name: "recommend_redis_sg",     type: "Spark Batch",     sourceTable: "ods.user_behavior_sg",     health: "Healthy", syncStatus: "In Sync", lastSuccess: "2026-05-12 02:00:00", schedule: "0 2 * * *",   ownerEmail: "diana.xu@company.com",                    dataverseSync: "In Sync"   },
  ],
  "4-1": [
    { id: "p4-1a", name: "graph_relation_th",      type: "Flink Streaming", sourceTable: "kafka.relation_events_th", health: "Warning", syncStatus: "Lagging", lastSuccess: "2026-05-11 18:00:00", schedule: "Continuous",  ownerEmail: "evan.park@company.com",  lag: "4.2 min", dataverseSync: "Not Found" },
  ],
};

const MOCK_USED_BY: Record<string, UsedByEntry[]> = {
  "1-1": [
    { id: "u1-1a", name: "credit_score_v2_fg",       model: "CreditScoreV2",        team: "Credit Risk Team",      status: "Active",     dailyQps: 12400, owner: ["alice.wang@company.com", "bob.chen@company.com"] },
    { id: "u1-1b", name: "risk_model_online_fg",      model: "RiskModelOnline",      team: "Risk Platform Team",    status: "Active",     dailyQps: 8900,  owner: ["diana.xu@company.com"] },
  ],
  "1-2": [
    { id: "u1-2a", name: "risk_th_realtime_fg",       model: "RiskTHRealtime",       team: "Credit Risk Team",      status: "Active",     dailyQps: 3200,  owner: ["alice.wang@company.com"] },
  ],
  "2-1": [
    { id: "u2-1a", name: "acard_mx_scoring_fg",       model: "ACardMXScoring",       team: "ACard Team",            status: "Active",     dailyQps: 5600,  owner: ["carlos.li@company.com", "evan.park@company.com"] },
  ],
  "2-2": [
    { id: "u2-2a", name: "acard_id_v3_fg",            model: "ACardIDV3",            team: "ACard Team",            status: "Active",     dailyQps: 7100,  owner: ["carlos.li@company.com"] },
    { id: "u2-2b", name: "credit_acard_combined_fg",  model: "CreditACardCombined",  team: "Credit Risk Team",      status: "Deprecated", dailyQps: 200,   owner: ["alice.wang@company.com"] },
  ],
  "3-1": [
    { id: "u3-1a", name: "recommend_shopee_sg_fg",    model: "RecommendShopeeSG",    team: "Recommendation Team",   status: "Active",     dailyQps: 18900, owner: ["diana.xu@company.com", "bob.chen@company.com"] },
  ],
  "4-1": [
    { id: "u4-1a", name: "graph_relation_th_fg",      model: "GraphRelationTH",      team: "Graph Analytics Team",  status: "Active",     dailyQps: 1400,  owner: ["evan.park@company.com"] },
  ],
};

const SOURCE_TYPES = ["HBase", "gRPC", "Redis", "GraphDB", "MySQL", "Kafka"];
const REGIONS = ["ID", "TH", "MX", "SG", "PH", "VN", "SHOPEE_SG"];
const DATA_LATENCY_OPTIONS = ["Online", "Nearline", "Offline"];

// Source type badge color map
const SOURCE_TYPE_COLORS: Record<string, string> = {
  HBase:   "bg-teal-50 text-teal-700 border-teal-200",
  gRPC:    "bg-violet-50 text-violet-700 border-violet-200",
  Redis:   "bg-rose-50 text-rose-700 border-rose-200",
  GraphDB: "bg-amber-50 text-amber-700 border-amber-200",
  MySQL:   "bg-blue-50 text-blue-700 border-blue-200",
  Kafka:   "bg-orange-50 text-orange-700 border-orange-200",
};

const LATENCY_COLORS: Record<string, string> = {
  Online:   "bg-emerald-50 text-emerald-700 border-emerald-200",
  Nearline: "bg-sky-50 text-sky-700 border-sky-200",
  Offline:  "bg-slate-100 text-slate-600 border-slate-200",
};

function nowString() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function computeVersion(subRows: SubRow[], region: string, excludeId?: string): string {
  const existing = subRows.filter(s => s.region === region && s.id !== excludeId);
  if (existing.length === 0) return "V1";
  const max = Math.max(...existing.map(s => parseInt(s.version.replace(/\D/g, "") || "0")));
  return `V${max + 1}`;
}

// ─── Test History Types & Mock Data ──────────────────────────────────────────

interface TestHistoryRecord {
  id: string;
  region: string;
  createTime: string;
  operator: string;
  status: "Success" | "Failed";
  input: Record<string, string>;
  output: Record<string, string>;
}

const MOCK_TEST_HISTORY: Record<string, TestHistoryRecord[]> = {
  "1": [
    { id: "h1-1", region: "ID", createTime: "2026-02-20 14:38:50.000", operator: "cedric.chencan@seamoney.com", status: "Success", input: { user_id: "U883421", id_card_no: "3201011990xxxxxx", platform_user_id: "SPay_ID_883421" }, output: { raw_map: '{"level":"low"}', risk_score: "72" } },
    { id: "h1-2", region: "ID", createTime: "2026-02-20 14:38:49.000", operator: "cedric.chencan@seamoney.com", status: "Success", input: { user_id: "U662201", id_card_no: "3172021985xxxxxx", platform_user_id: "SPay_ID_662201" }, output: { raw_map: '{"level":"medium"}', risk_score: "48" } },
    { id: "h1-3", region: "TH", createTime: "2026-02-18 10:15:30.000", operator: "zhengyi.loh@seamoney.com",   status: "Success", input: { user_id: "U_TH_77821" }, output: { raw_map: '{"level":"high"}', data_status: "1" } },
    { id: "h1-4", region: "ID", createTime: "2026-02-15 09:20:10.000", operator: "cedric.chencan@seamoney.com", status: "Failed",  input: { user_id: "U_INVALID", id_card_no: "", platform_user_id: "" }, output: {} },
  ],
  "2": [
    { id: "h2-1", region: "MX", createTime: "2026-02-21 11:30:00.000", operator: "zhengyi.loh@seamoney.com",   status: "Success", input: { id_card_no: "MX19921010xxx", platform_user_id: "Spay_MX_441", phone_number: "+521234567890" }, output: { acard_score: "88", acard_tier: "A" } },
    { id: "h2-2", region: "ID", createTime: "2026-02-18 14:12:55.000", operator: "cedric.chencan@seamoney.com", status: "Failed",  input: { id_card_no: "3201INVALID", platform_user_id: "" }, output: {} },
  ],
  "3": [
    { id: "h3-1", region: "SHOPEE_SG", createTime: "2026-02-22 10:00:00.000", operator: "huangwei@shopee.com", status: "Success", input: { user_id: "SG_USER_9921", scene_id: "homepage_feed" }, output: { item_list: '["item_001","item_002"]', score_map: '{"item_001":0.92}' } },
  ],
  "4": [
    { id: "h4-1", region: "TH", createTime: "2026-02-20 13:45:00.000", operator: "cedric.chencan@seamoney.com", status: "Success", input: { user_id: "TH_USER_4421", depth: "2", relation_type: "transfer" }, output: { node_list: '["node_A","node_B"]', edge_list: '["A->B"]', relation_score: "85" } },
  ],
};

// ─── Small Shared Components ──────────────────────────────────────────────────

function RegionTag({ region, status }: { region: string; status?: SubStatus }) {
  const dotCls = status === "ENABLE" ? "bg-emerald-500" : status === "DISABLE" ? "bg-red-500" : "bg-slate-400";
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-white border border-slate-200 text-slate-600 whitespace-nowrap">
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotCls}`} />
      {region}
    </span>
  );
}

function StatusBadge({ status }: { status: SubStatus }) {
  if (status === "ENABLE")
    return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />ENABLE</span>;
  if (status === "DISABLE")
    return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs bg-red-50 text-red-600 border border-red-200 whitespace-nowrap"><span className="w-1.5 h-1.5 rounded-full bg-red-500" />DISABLE</span>;
  return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs bg-slate-100 text-slate-500 border border-slate-200 whitespace-nowrap"><span className="w-1.5 h-1.5 rounded-full bg-slate-400" />DRAFT</span>;
}

function SourceTypeBadge({ type }: { type: string }) {
  const cls = SOURCE_TYPE_COLORS[type] ?? "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs border whitespace-nowrap ${cls}`}>
      {type}
    </span>
  );
}

function LatencyBadge({ latency }: { latency: string }) {
  const cls = LATENCY_COLORS[latency] ?? "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs border whitespace-nowrap ${cls}`}>
      {latency}
    </span>
  );
}

function ScriptTypeBadge({ type }: { type: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs bg-violet-50 text-violet-700 border border-violet-200 whitespace-nowrap">
      {type}
    </span>
  );
}

function SourcePipelineBadge({ status }: { status: "Healthy" | "Warning" | "No Records" }) {
  if (status === "Healthy")
    return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Healthy</span>;
  if (status === "Warning")
    return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs bg-red-50 text-red-600 border border-red-200 whitespace-nowrap"><span className="w-1.5 h-1.5 rounded-full bg-red-500" />Warning</span>;
  return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs bg-amber-50 text-amber-600 border border-amber-200 whitespace-nowrap"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" />No Records</span>;
}

function ParamChip({ name, dataType }: { name: string; dataType: string }) {
  return (
    <span className="inline-flex items-baseline gap-0.5 px-2 py-0.5 rounded bg-slate-50 text-slate-600 text-xs border border-slate-200 whitespace-nowrap">
      <span className="font-mono">{name}</span>
      <span className="text-slate-400 text-[10px]">({dataType})</span>
    </span>
  );
}

// ─── Script Editor (with line numbers) ───────────────────────────────────────

function ScriptEditor({ value, onChange, disabled = false, scriptType = "Groovy" }: {
  value: string;
  onChange?: (v: string) => void;
  disabled?: boolean;
  scriptType?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumRef  = useRef<HTMLDivElement>(null);
  const lines       = value.split("\n");
  const lineCount   = Math.max(lines.length, 6);

  const handleScroll = () => {
    if (textareaRef.current && lineNumRef.current) {
      lineNumRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${
      disabled ? "border-slate-200" : "border-slate-300 focus-within:border-teal-400 focus-within:ring-2 focus-within:ring-teal-100"
    }`}>
      {/* Mac-style header */}
      <div className="flex items-center gap-1.5 px-3 py-2 bg-[#f7f7f7] border-b border-slate-200">
        <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
        <span className="ml-2.5 text-xs font-mono text-slate-500">{scriptType.toLowerCase()}</span>
      </div>
      {/* Code area */}
      <div className="flex" style={{ maxHeight: 210, overflow: "hidden" }}>
        {/* Line numbers */}
        <div
          ref={lineNumRef}
          className="select-none overflow-hidden flex-shrink-0 bg-[#f7f7f7] border-r border-slate-200 text-right"
          style={{ minWidth: 38, maxHeight: 210 }}
        >
          <div className="pt-3 pb-3 pr-2 pl-1 space-y-0">
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i} className="text-[11px] font-mono text-slate-400 leading-[1.55rem]">{i + 1}</div>
            ))}
          </div>
        </div>
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => onChange?.(e.target.value)}
          disabled={disabled}
          onScroll={handleScroll}
          rows={lineCount}
          spellCheck={false}
          className={`flex-1 px-4 py-3 text-xs font-mono resize-none outline-none leading-[1.55rem] overflow-auto ${
            disabled ? "bg-slate-50 text-slate-500 cursor-not-allowed" : "bg-white text-slate-700 caret-teal-500"
          }`}
          style={{ maxHeight: 210 }}
        />
      </div>
    </div>
  );
}

// ─── Param Row Editor ─────────────────────────────────────────────────────────

function ParamRowEditor({
  params, onChange, disabled = false,
}: {
  params: ParamRow[];
  onChange?: (params: ParamRow[]) => void;
  disabled?: boolean;
}) {
  const addRow    = () => onChange?.([...params, { name: "", dataType: "string" }]);
  const removeRow = (i: number) => { if (params.length <= 1) return; onChange?.(params.filter((_, idx) => idx !== i)); };
  const updateRow = (i: number, field: keyof ParamRow, val: string) =>
    onChange?.(params.map((r, idx) => idx === i ? { ...r, [field]: val } : r));

  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-3 py-2 text-left text-xs text-slate-500">Param Name</th>
              <th className="px-3 py-2 text-left text-xs text-slate-500 w-32">Data Type</th>
              {!disabled && <th className="px-3 py-2 w-9" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {params.length === 0 && (
              <tr><td colSpan={disabled ? 2 : 3} className="px-3 py-3 text-xs text-slate-300 italic">—</td></tr>
            )}
            {params.map((row, i) => (
              <tr key={i}>
                <td className="px-3 py-2">
                  {disabled ? (
                    <span className="text-xs text-slate-700 font-mono">{row.name || "—"}</span>
                  ) : (
                    <input
                      type="text" value={row.name}
                      onChange={(e) => updateRow(i, "name", e.target.value)}
                      placeholder="param_name"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-100 transition-all font-mono placeholder:text-slate-300 bg-white"
                    />
                  )}
                </td>
                <td className="px-3 py-2 w-32">
                  {disabled ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-violet-50 text-violet-600 border border-violet-200 font-mono">{row.dataType}</span>
                  ) : (
                    <div className="relative">
                      <select
                        value={row.dataType}
                        onChange={(e) => updateRow(i, "dataType", e.target.value)}
                        className="w-full appearance-none px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-100 transition-all bg-white text-slate-700"
                      >
                        {DATA_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                    </div>
                  )}
                </td>
                {!disabled && (
                  <td className="px-3 py-2">
                    <button
                      type="button" disabled={params.length <= 1} onClick={() => removeRow(i)}
                      className="p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!disabled && (
        <button type="button" onClick={addRow} className="flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-800 transition-colors">
          <Plus className="w-3.5 h-3.5" />Add Param
        </button>
      )}
    </div>
  );
}

// ─── Alert Modal ──────────────────────────────────────────────────────────────

function Modal({ state, onClose }: { state: ModalState; onClose: () => void }) {
  useEffect(() => {
    if (!state.open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [state.open, onClose]);

  if (!state.open) return null;
  const iconMap = {
    warning: <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center"><AlertTriangle className="w-4.5 h-4.5 text-amber-500" /></div>,
    error:   <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center"><Trash2 className="w-4.5 h-4.5 text-red-500" /></div>,
    info:    <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center"><Link2 className="w-4.5 h-4.5 text-teal-500" /></div>,
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">{iconMap[state.type]}<h3 className="text-slate-800 text-sm">{state.title}</h3></div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-5 py-4">{state.body}</div>
        <div className="flex justify-end px-5 py-3 border-t border-slate-100 bg-slate-50/60">
          <button onClick={onClose} className="px-5 py-2 text-sm text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition-all">Got it</button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal A: Add / Edit Feature Source Metadata ──────────────────────────────

function MetaFormModal({ open, mode, row, onClose, onSubmit }: {
  open: boolean; mode: "add" | "editMeta"; row?: FeatureRow;
  onClose: () => void; onSubmit: (data: MetaFormData, mode: "add" | "editMeta", rowId?: string) => void;
}) {
  const isEdit = mode === "editMeta";
  const buildInitial = (): MetaFormData => isEdit && row
    ? { featureSource: row.featureSource, sourceType: row.sourceType, dataLatency: row.dataLatency, description: row.description }
    : { featureSource: "", sourceType: "", dataLatency: "", description: "" };

  const [form, setForm]     = useState<MetaFormData>(buildInitial);
  const [errors, setErrors] = useState<Partial<Record<keyof MetaFormData, string>>>({});

  useEffect(() => { if (open) { setForm(buildInitial()); setErrors({}); } }, [open, mode, row?.id]);
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;

  const validate = (): boolean => {
    const errs: Partial<Record<keyof MetaFormData, string>> = {};
    if (!form.featureSource.trim()) errs.featureSource = "Required";
    else if (/^\d/.test(form.featureSource)) errs.featureSource = "Cannot start with a digit";
    else if (/\s/.test(form.featureSource)) errs.featureSource = "No spaces allowed";
    if (!form.sourceType) errs.sourceType = "Please select Source Type";
    if (!form.dataLatency) errs.dataLatency = "Please select Data Latency";
    setErrors(errs); return Object.keys(errs).length === 0;
  };

  const set = (field: keyof MetaFormData, val: string) => { setErrors(e => ({ ...e, [field]: undefined })); setForm(f => ({ ...f, [field]: val })); };
  const handleSubmit = () => { if (validate()) { onSubmit(form, mode, row?.id); onClose(); } };

  const labelCls   = "text-sm text-slate-500 text-right pt-2.5 whitespace-nowrap";
  const inputCls   = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all text-slate-800 placeholder:text-slate-300 bg-white";
  const disabledCls = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none bg-slate-50 text-slate-400 cursor-not-allowed";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-lg mx-4 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center">
              {isEdit ? <FileEdit className="w-4 h-4 text-white" /> : <Plus className="w-4 h-4 text-white" />}
            </div>
            <h2 className="text-slate-800 text-sm">{isEdit ? "Edit Feature Source" : "Add Feature Source"}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"><X className="w-4 h-4" /></button>
        </div>
        {/* Body */}
        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          {/* Feature Source */}
          <div className="grid grid-cols-[120px_1fr] items-start gap-4">
            <label className={labelCls}>Feature Source <span className="text-red-500">*</span></label>
            <div>
              <input type="text" disabled={isEdit} value={form.featureSource} onChange={e => set("featureSource", e.target.value)}
                placeholder="e.g. credit_hbase_user_risk" className={`${isEdit ? disabledCls : inputCls} ${errors.featureSource ? "border-red-300" : ""}`} />
              {errors.featureSource && <p className="mt-1 text-xs text-red-500">{errors.featureSource}</p>}
            </div>
          </div>
          {/* Source Type */}
          <div className="grid grid-cols-[120px_1fr] items-start gap-4">
            <label className={labelCls}>Source Type <span className="text-red-500">*</span></label>
            <div className="relative">
              <select value={form.sourceType} onChange={e => set("sourceType", e.target.value)}
                className={`appearance-none ${inputCls} pr-9 ${errors.sourceType ? "border-red-300" : ""}`}>
                <option value="">Please select</option>
                {SOURCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              {errors.sourceType && <p className="mt-1 text-xs text-red-500">{errors.sourceType}</p>}
            </div>
          </div>
          {/* Data Latency */}
          <div className="grid grid-cols-[120px_1fr] items-start gap-4">
            <label className={labelCls}>Data Latency <span className="text-red-500">*</span></label>
            <div className="relative">
              <select value={form.dataLatency} onChange={e => set("dataLatency", e.target.value)}
                className={`appearance-none ${inputCls} pr-9 ${errors.dataLatency ? "border-red-300" : ""}`}>
                <option value="">Please select</option>
                {DATA_LATENCY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              {errors.dataLatency && <p className="mt-1 text-xs text-red-500">{errors.dataLatency}</p>}
            </div>
          </div>
          {/* Description */}
          <div className="grid grid-cols-[120px_1fr] items-start gap-4">
            <label className={labelCls}>Description</label>
            <textarea rows={3} value={form.description} onChange={e => set("description", e.target.value)}
              placeholder="Optional description" className={`${inputCls} resize-none`} />
          </div>
        </div>
        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 flex-shrink-0 bg-slate-50/40">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all">Cancel</button>
          <button onClick={handleSubmit} className="px-5 py-2 text-sm rounded-lg bg-teal-600 hover:bg-teal-700 text-white transition-all shadow-sm">
            {isEdit ? "Save" : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Region Form Modal (Add / Edit / Copy) ────────────────────────────────────

function RegionFormModal({ open, mode, parentRow, subRow, onClose, onSubmit }: {
  open: boolean; mode: RegionFormMode; parentRow: FeatureRow; subRow?: SubRow;
  onClose: () => void; onSubmit: (data: RegionFormData, mode: RegionFormMode) => void;
}) {
  const isEdit = mode === "edit";
  const isCopy = mode === "copy";

  const buildInitial = (): RegionFormData => {
    if (isEdit && subRow) return {
      region: subRow.region, version: subRow.version, scriptType: subRow.scriptType,
      inputParams: subRow.inputParams.length > 0 ? subRow.inputParams : [{ name: "", dataType: "string" }],
      callFunction: subRow.callFunction,
      outputParams: subRow.outputParams.length > 0 ? subRow.outputParams : [{ name: "", dataType: "string" }],
    };
    if (isCopy && subRow) return {
      region: "", version: "", scriptType: subRow.scriptType,
      inputParams: subRow.inputParams.length > 0 ? subRow.inputParams : [{ name: "", dataType: "string" }],
      callFunction: subRow.callFunction,
      outputParams: subRow.outputParams.length > 0 ? subRow.outputParams : [{ name: "", dataType: "string" }],
    };
    const cfTemplate = parentRow.sourceType && CF_TEMPLATE[parentRow.sourceType] ? CF_TEMPLATE[parentRow.sourceType] : "";
    return { region: "", version: "", scriptType: "Groovy", inputParams: [{ name: "", dataType: "string" }], callFunction: cfTemplate, outputParams: [{ name: "", dataType: "string" }] };
  };

  const [form, setForm]     = useState<RegionFormData>(buildInitial);
  const [errors, setErrors] = useState<Partial<Record<keyof RegionFormData, string>>>({});

  useEffect(() => { if (open) { setForm(buildInitial()); setErrors({}); } }, [open, mode, subRow?.id, parentRow.id]);
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  // Auto-compute version when region changes (Add / Copy only)
  useEffect(() => {
    if (isEdit) return;
    if (!form.region) { setForm(f => ({ ...f, version: "" })); return; }
    const v = computeVersion(parentRow.subRows, form.region, subRow?.id);
    setForm(f => ({ ...f, version: v }));
  }, [form.region, isEdit, parentRow.subRows]);

  if (!open) return null;

  const validate = (): boolean => {
    const errs: Partial<Record<keyof RegionFormData, string>> = {};
    if (!form.region) errs.region = "Please select Region";
    setErrors(errs); return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => { if (validate()) { onSubmit(form, mode); onClose(); } };

  const labelCls    = "text-sm text-slate-500 text-right pt-2.5 whitespace-nowrap flex-shrink-0 w-[108px]";
  const inputCls    = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all text-slate-800 bg-white";
  const disabledCls = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none bg-slate-50 text-slate-400 cursor-not-allowed";

  const titleMap: Record<RegionFormMode, string> = { add: "Add Region Config", edit: "Edit Region Config", copy: "Copy Region Config" };
  const iconMap: Record<RegionFormMode, React.ReactNode> = {
    add:  <Plus className="w-4 h-4 text-white" />,
    edit: <FileEdit className="w-4 h-4 text-white" />,
    copy: <Copy className="w-4 h-4 text-white" />,
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-xl mx-4 flex flex-col max-h-[92vh]" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center">{iconMap[mode]}</div>
            <h2 className="text-slate-800 text-sm">{titleMap[mode]}</h2>
            {isCopy && subRow && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-sky-50 text-sky-600 border border-sky-200">
                from {subRow.region} {subRow.version}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"><X className="w-4 h-4" /></button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          {/* Feature Source */}
          <div className="flex items-start gap-4">
            <label className={labelCls}>Feature Source</label>
            <input type="text" disabled value={parentRow.featureSource} className={disabledCls} />
          </div>

          {/* Region */}
          <div className="flex items-start gap-4">
            <label className={labelCls}><span className="text-red-500 mr-0.5">*</span>Region</label>
            <div className="flex-1">
              <div className="relative">
                <select
                  disabled={isEdit} value={form.region}
                  onChange={e => { setErrors(err => ({ ...err, region: undefined })); setForm(f => ({ ...f, region: e.target.value })); }}
                  className={`appearance-none pr-9 ${isEdit ? disabledCls : inputCls} ${errors.region ? "border-red-300" : ""}`}
                >
                  <option value="">Please select</option>
                  {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
              {errors.region && <p className="mt-1 text-xs text-red-500">{errors.region}</p>}
            </div>
          </div>

          {/* Version */}
          <div className="flex items-start gap-4">
            <label className={labelCls}>Version</label>
            <input type="text" disabled value={form.version || "—"}
              className={disabledCls} placeholder="Auto-calculated" />
          </div>

          {/* Input Params */}
          <div className="flex items-start gap-4">
            <label className={labelCls}>Input Params</label>
            <div className="flex-1">
              <ParamRowEditor params={form.inputParams} onChange={v => setForm(f => ({ ...f, inputParams: v }))} />
            </div>
          </div>

          {/* Script Type + Script */}
          <div className="flex items-start gap-4">
            <label className={labelCls}><span className="text-red-500 mr-0.5">*</span>Script</label>
            <div className="flex-1 space-y-2">
              {/* Script Type selector */}
              <div className="relative w-36">
                <select value={form.scriptType} onChange={e => setForm(f => ({ ...f, scriptType: e.target.value }))}
                  className={`appearance-none pr-8 ${inputCls} text-xs`}>
                  {SCRIPT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
              <ScriptEditor
                value={form.callFunction}
                onChange={v => setForm(f => ({ ...f, callFunction: v }))}
                scriptType={form.scriptType}
              />
            </div>
          </div>

          {/* Output Params */}
          <div className="flex items-start gap-4">
            <label className={labelCls}>Output Params</label>
            <div className="flex-1">
              <ParamRowEditor params={form.outputParams} onChange={v => setForm(f => ({ ...f, outputParams: v }))} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 flex-shrink-0 bg-slate-50/40">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all">Cancel</button>
          <button onClick={handleSubmit} className="px-5 py-2 text-sm rounded-lg bg-teal-600 hover:bg-teal-700 text-white transition-all shadow-sm">
            {isEdit ? "Save" : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── View Region Config Modal ─────────────────────────────────────────────────

function ViewRegionModal({ open, parentRow, subRow, onClose }: {
  open: boolean; parentRow: FeatureRow; subRow: SubRow; onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;

  const labelCls    = "text-sm text-slate-500 text-right pt-2.5 whitespace-nowrap flex-shrink-0 w-[108px]";
  const disabledCls = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none bg-slate-50 text-slate-400 cursor-not-allowed";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-xl mx-4 flex flex-col max-h-[92vh]" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center">
              <Eye className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-slate-800 text-sm">View Region Config</h2>
            <StatusBadge status={subRow.status} />
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"><X className="w-4 h-4" /></button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          {/* Feature Source */}
          <div className="flex items-start gap-4">
            <label className={labelCls}>Feature Source</label>
            <input type="text" disabled value={parentRow.featureSource} className={disabledCls} />
          </div>

          {/* Region */}
          <div className="flex items-start gap-4">
            <label className={labelCls}><span className="text-red-500 mr-0.5">*</span>Region</label>
            <input type="text" disabled value={subRow.region} className={disabledCls} />
          </div>

          {/* Version */}
          <div className="flex items-start gap-4">
            <label className={labelCls}>Version</label>
            <input type="text" disabled value={subRow.version} className={disabledCls} />
          </div>

          {/* Input Params */}
          <div className="flex items-start gap-4">
            <label className={labelCls}>Input Params</label>
            <div className="flex-1">
              <ParamRowEditor params={subRow.inputParams.length > 0 ? subRow.inputParams : []} disabled />
            </div>
          </div>

          {/* Script */}
          <div className="flex items-start gap-4">
            <label className={labelCls}><span className="text-red-500 mr-0.5">*</span>Script</label>
            <div className="flex-1">
              <ScriptEditor value={subRow.callFunction} disabled scriptType={subRow.scriptType} />
            </div>
          </div>

          {/* Output Params */}
          <div className="flex items-start gap-4">
            <label className={labelCls}>Output Params</label>
            <div className="flex-1">
              <ParamRowEditor params={subRow.outputParams.length > 0 ? subRow.outputParams : []} disabled />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 flex-shrink-0 bg-slate-50/40">
          <button onClick={onClose} className="px-5 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all">Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── Manage Dropdown ──────────────────────────────────────────────────────────

function ManageDropdown({ subRow, onEnable, onDisable, onDraft }: {
  subRow: SubRow; onEnable: () => void; onDisable: () => void; onDraft: () => void;
}) {
  const [open, setOpen]                   = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const btnRef                            = useRef<HTMLButtonElement>(null);
  const [dropPos, setDropPos]             = useState<{ top: number; right: number } | null>(null);

  const canEnable  = subRow.status === "DRAFT";
  const canDisable = subRow.status === "ENABLE";
  const canDraft   = subRow.status === "DISABLE";

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setDropPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
    setOpen(v => !v); setShowDisableConfirm(false);
  };

  useEffect(() => {
    if (!open) return;
    const close = () => { setOpen(false); setShowDisableConfirm(false); };
    const handler = (e: MouseEvent) => { if (btnRef.current && !btnRef.current.contains(e.target as Node)) close(); };
    document.addEventListener("mousedown", handler);
    window.addEventListener("scroll", close, true);
    return () => { document.removeEventListener("mousedown", handler); window.removeEventListener("scroll", close, true); };
  }, [open]);

  const linkedGroups = DOWNSTREAM_FEATURE_GROUPS[subRow.id] ?? ["unknown_feature_group"];

  return (
    <span className="inline-flex">
      <button ref={btnRef} onClick={handleToggle}
        className="inline-flex items-center gap-1 text-xs text-teal-600 hover:text-teal-800 transition-colors">
        Manage <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && dropPos && (
        <div style={{ position: "fixed", top: dropPos.top, right: dropPos.right, zIndex: 9999 }}
          className="bg-white border border-slate-200 rounded-xl shadow-xl shadow-slate-200/70 overflow-hidden min-w-[190px]"
          onMouseDown={e => e.stopPropagation()}>
          {!showDisableConfirm ? (
            <div>
              <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">Actions</span>
                <StatusBadge status={subRow.status} />
              </div>
              <button disabled={!canEnable} onClick={() => { onEnable(); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs transition-colors ${canEnable ? "text-emerald-600 hover:bg-emerald-50" : "text-slate-300 cursor-not-allowed"}`}>
                <CheckCircle2 className="w-3.5 h-3.5" />Enable
                {!canEnable && <span className="ml-auto text-[10px] text-slate-300">Only DRAFT</span>}
              </button>
              <button disabled={!canDisable} onClick={() => canDisable && setShowDisableConfirm(true)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs transition-colors ${canDisable ? "text-orange-500 hover:bg-orange-50" : "text-slate-300 cursor-not-allowed"}`}>
                <XCircle className="w-3.5 h-3.5" />Disable
                {!canDisable && <span className="ml-auto text-[10px] text-slate-300">Only ENABLE</span>}
              </button>
              <button disabled={!canDraft} onClick={() => { onDraft(); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs transition-colors ${canDraft ? "text-slate-600 hover:bg-slate-50" : "text-slate-300 cursor-not-allowed"}`}>
                <ToggleLeft className="w-3.5 h-3.5" />Draft
                {!canDraft && <span className="ml-auto text-[10px] text-slate-300">Only DISABLE</span>}
              </button>
            </div>
          ) : (
            <div className="p-3.5 space-y-3">
              <div className="flex items-center gap-1.5 text-orange-600"><AlertTriangle className="w-3.5 h-3.5" /><span className="text-xs">Confirm Disable</span></div>
              <p className="text-[11px] text-slate-500 leading-relaxed">Referenced by <strong className="text-slate-700">{linkedGroups.length}</strong> downstream Feature Group{linkedGroups.length > 1 ? "s" : ""}:</p>
              <div className="rounded-lg bg-orange-50 border border-orange-200 px-2.5 py-2 space-y-1">
                {linkedGroups.map(g => (
                  <div key={g} className="flex items-center gap-1.5 text-[11px]">
                    <span className="w-1 h-1 rounded-full bg-orange-400 flex-shrink-0" />
                    <code className="text-orange-700 font-mono">{g}</code>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-0.5">
                <button onClick={() => setShowDisableConfirm(false)} className="px-3 py-1.5 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
                <button onClick={() => { onDisable(); setOpen(false); setShowDisableConfirm(false); }} className="px-3 py-1.5 text-xs text-white bg-orange-500 rounded-lg hover:bg-orange-600">Disable</button>
              </div>
            </div>
          )}
        </div>
      )}
    </span>
  );
}

// ─── Lineage Modal ────────────────────────────────────────────────────────────

const PIPELINE_TYPE_STYLE: Record<UpstreamPipeline["type"], { icon: React.ReactNode; cls: string }> = {
  "Spark Batch":     { icon: <Database className="w-3 h-3" />,      cls: "bg-sky-50 text-sky-700 border-sky-200" },
  "Flink Streaming": { icon: <Zap className="w-3 h-3" />,           cls: "bg-violet-50 text-violet-700 border-violet-200" },
  "Airflow DAG":     { icon: <CalendarClock className="w-3 h-3" />, cls: "bg-amber-50 text-amber-700 border-amber-200" },
};

const HEALTH_STYLE: Record<UpstreamPipeline["health"], { dot: string; text: string }> = {
  Healthy: { dot: "bg-emerald-500", text: "text-emerald-600" },
  Warning: { dot: "bg-amber-400",   text: "text-amber-600" },
  Error:   { dot: "bg-red-500",     text: "text-red-600" },
};

const SYNC_STYLE: Record<UpstreamPipeline["syncStatus"], string> = {
  "In Sync": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Lagging": "bg-amber-50 text-amber-700 border-amber-200",
  "Failed":  "bg-red-50 text-red-600 border-red-200",
};

function LineageModal({ open, parentRow, subRow, onClose }: {
  open: boolean; parentRow: FeatureRow; subRow: SubRow; onClose: () => void;
}) {
  const [tab, setTab] = useState<"upstream" | "usedby">("upstream");
  const [pipelines, setPipelines] = useState<UpstreamPipeline[]>(() => MOCK_UPSTREAM_PIPELINES[subRow.id] ?? []);

  useEffect(() => {
    if (open) { setTab("upstream"); setPipelines(MOCK_UPSTREAM_PIPELINES[subRow.id] ?? []); }
  }, [open, subRow.id]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;

  const usedBy   = MOCK_USED_BY[subRow.id] ?? [];
  const unbind   = (id: string) => setPipelines(prev => prev.filter(p => p.id !== id));

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-2xl mx-4 flex flex-col max-h-[82vh]" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
              <GitBranch className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-slate-800 text-sm">Lineage</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                <span className="font-mono">{parentRow.featureSource}</span>
                <span className="mx-1.5 text-slate-300">·</span>
                <span className="font-mono">{subRow.region}</span>
                <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] font-mono">{subRow.version}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 px-6 flex-shrink-0">
          {(["upstream", "usedby"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`relative px-1 py-3 mr-7 text-sm transition-colors ${tab === t ? "text-indigo-600" : "text-slate-500 hover:text-slate-700"}`}>
              <span className="flex items-center gap-1.5">
                {t === "upstream" ? "Upstream Pipeline" : "Used By"}
                <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] transition-colors ${
                  tab === t ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-500"
                }`}>
                  {t === "upstream" ? pipelines.length : usedBy.length}
                </span>
              </span>
              {tab === t && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Tab: Upstream Pipeline ── */}
          {tab === "upstream" && (
            <div className="p-5 space-y-3">
              {pipelines.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
                  <GitBranch className="w-8 h-8 text-slate-200" />
                  <p className="text-sm">No upstream pipelines bound</p>
                </div>
              ) : pipelines.map(pl => {
                const typeStyle = PIPELINE_TYPE_STYLE[pl.type];
                const healthStyle = HEALTH_STYLE[pl.health];
                return (
                  <div key={pl.id} className="border border-slate-200 rounded-xl overflow-hidden">
                    {/* Card header */}
                    <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                      <div className="flex items-center gap-2.5">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs border ${typeStyle.cls}`}>
                          {typeStyle.icon}{pl.type}
                        </span>
                        <span className="text-sm font-mono text-slate-800">{pl.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`flex items-center gap-1 text-xs ${pl.dataverseSync === "In Sync" ? "text-emerald-600" : "text-slate-400"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${pl.dataverseSync === "In Sync" ? "bg-emerald-500" : "bg-slate-300"}`} />{pl.dataverseSync}
                        </span>
                        {pl.dataverseSync === "In Sync" && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${SYNC_STYLE[pl.syncStatus]}`}>
                            {pl.type === "Spark Batch"
                              ? ({ "In Sync": "Online", "Lagging": "Freeze", "Failed": "Offline" } as Record<string, string>)[pl.syncStatus] ?? pl.syncStatus
                              : pl.type === "Flink Streaming"
                              ? ({ "In Sync": "Running", "Lagging": "Killed", "Failed": "Failed" } as Record<string, string>)[pl.syncStatus] ?? pl.syncStatus
                              : pl.syncStatus}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Card body */}
                    {pl.dataverseSync === "In Sync" && (
                      <div className="px-4 py-3 grid grid-cols-3 gap-x-4 gap-y-2 text-xs">
                        <div>
                          <p className="text-slate-400 mb-0.5">Source Table</p>
                          <p className="font-mono text-slate-700 truncate">{pl.sourceTable}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 mb-0.5">Schedule</p>
                          <p className="font-mono text-slate-700">{pl.schedule}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 mb-0.5">{pl.type === "Flink Streaming" ? "Lag" : "Last Success"}</p>
                          <p className="text-slate-700">{pl.type === "Flink Streaming" ? (pl.lag ?? "—") : pl.lastSuccess}</p>
                        </div>
                      </div>
                    )}
                    {/* Card footer */}
                    <div className="px-4 py-2.5 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{pl.ownerEmail}</span>
                        <a href="#" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-indigo-500 hover:text-indigo-700 transition-colors">
                          <ExternalLink className="w-3 h-3" />View in DataVerse
                        </a>
                      </div>
                      <button
                        onClick={() => unbind(pl.id)}
                        className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition-colors"
                      >
                        <Unlink className="w-3 h-3" />Unbind
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Bind button */}
              <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-slate-300 text-sm text-slate-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/40 transition-all">
                <Plus className="w-4 h-4" />Bind another pipeline…
              </button>

              {/* Footer hint */}
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Clock className="w-3 h-3" />Last refreshed: just now
              </div>
            </div>
          )}

          {/* ── Tab: Used By ── */}
          {tab === "usedby" && (
            <div className="overflow-hidden">
              {usedBy.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
                  <Users className="w-8 h-8 text-slate-200" />
                  <p className="text-sm">No feature groups using this config</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-50 z-10">
                    <tr className="border-b border-slate-200">
                      {["Feature Group", "Owner"].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-xs text-slate-400 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {usedBy.map((entry, i) => (
                      <tr key={entry.id} className={`border-b border-slate-100 last:border-0 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/40"} hover:bg-indigo-50/30 transition-colors`}>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <span className="text-xs font-mono text-slate-800">{entry.name}</span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex flex-wrap gap-1">
                            {entry.owner.map(email => (
                              <span key={email} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap">
                                <Mail className="w-2.5 h-2.5" />{email}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-3.5 border-t border-slate-100 flex-shrink-0 bg-slate-50/40">
          <button onClick={onClose} className="px-5 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Nested Sub-Table ─────────────────────────────────────────────────────────

function SubTable({ rows, sourceType, onStatusChange, onEdit, onView, onCopy, onLineage }: {
  rows: SubRow[]; sourceType: string;
  onStatusChange: (subRowId: string, newStatus: SubStatus) => void;
  onEdit: (subRow: SubRow) => void;
  onView: (subRow: SubRow) => void;
  onCopy: (subRow: SubRow) => void;
  onLineage: (subRow: SubRow) => void;
}) {
  return (
    <div className="border-t border-slate-100 bg-slate-50/40">
      <div className="mx-6 my-3">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-200">
              {["Region", "Script Type", "Version", "Input Params", "Output Params", "Status", "UpdateTime", "Source Pipeline", "Action"].map((h) => (
                <th key={h} className="px-3 py-2 text-left text-xs text-slate-400 whitespace-nowrap bg-slate-50/80">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.id} className={`border-b border-slate-100 last:border-0 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/50"} hover:bg-teal-50/30 transition-colors`}>
                {/* Region */}
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <RegionTag region={row.region} status={row.status} />
                </td>
                {/* Script Type */}
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <ScriptTypeBadge type={row.scriptType ?? "Groovy"} />
                </td>
                {/* Version */}
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <span className="text-xs font-mono text-slate-600 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">{row.version}</span>
                </td>
                {/* Input Params */}
                <td className="px-3 py-2.5">
                  <div className="flex flex-wrap gap-1 max-w-[240px]">
                    {row.inputParams.map(p => <ParamChip key={p.name} name={p.name} dataType={p.dataType} />)}
                  </div>
                </td>
                {/* Output Params */}
                <td className="px-3 py-2.5">
                  <div className="flex flex-wrap gap-1 max-w-[160px]">
                    {row.outputParams.map(p => <ParamChip key={p.name} name={p.name} dataType={p.dataType} />)}
                  </div>
                </td>
                {/* Status */}
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <StatusBadge status={row.status} />
                </td>
                {/* UpdateTime */}
                <td className="px-3 py-2.5 text-xs text-slate-400 whitespace-nowrap">{row.updateTime}</td>
                {/* Source Pipeline */}
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <SourcePipelineBadge status={(() => { const pl = MOCK_UPSTREAM_PIPELINES[row.id] ?? []; if (pl.length === 0) return "No Records"; if (pl.every(p => p.health === "Healthy")) return "Healthy"; return "Warning"; })()} />
                </td>
                {/* Action */}
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <button onClick={() => onView(row)} className="text-xs text-teal-600 hover:text-teal-800 transition-colors">View</button>
                    <span className="text-slate-200">|</span>
                    <button onClick={() => onEdit(row)} className="text-xs text-teal-600 hover:text-teal-800 transition-colors">Edit</button>
                    <span className="text-slate-200">|</span>
                    <button onClick={() => onCopy(row)} className="text-xs text-teal-600 hover:text-teal-800 transition-colors">Copy</button>
                    <span className="text-slate-200">|</span>
                    <button onClick={() => onLineage(row)} className="text-xs text-teal-600 hover:text-teal-800 transition-colors">Lineage</button>
                    <span className="text-slate-200">|</span>
                    <ManageDropdown
                      subRow={row}
                      onEnable={() => onStatusChange(row.id, "ENABLE")}
                      onDisable={() => onStatusChange(row.id, "DISABLE")}
                      onDraft={() => onStatusChange(row.id, "DRAFT")}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Test Modal ───────────────────────────────────────────────────────────────

function TestModal({ open, row, onClose }: { open: boolean; row: FeatureRow | null; onClose: () => void }) {
  const [tab, setTab]                     = useState<"new" | "history">("new");
  const [testRegion, setTestRegion]       = useState("");
  const [inputValues, setInputValues]     = useState<Record<string, string>>({});
  const [outputValues, setOutputValues]   = useState<Record<string, string>>({});
  const [duration, setDuration]           = useState<number | null>(null);
  const [isTesting, setIsTesting]         = useState(false);
  const [showJsonEditor, setShowJsonEditor] = useState(false);
  const [jsonPaste, setJsonPaste]         = useState("");
  const [hRegion, setHRegion]             = useState("");
  const [hOperator, setHOperator]         = useState("");
  const [hStatus, setHStatus]             = useState<"" | "Success" | "Failed">("");
  const [applied, setApplied]             = useState({ region: "", operator: "", status: "" as "" | "Success" | "Failed" });
  const [detailRecord, setDetailRecord]   = useState<TestHistoryRecord | null>(null);
  const [copiedInput, setCopiedInput]     = useState(false);
  const [copiedOutput, setCopiedOutput]   = useState(false);

  useEffect(() => {
    if (open) {
      setTab("new"); setTestRegion(""); setInputValues({}); setOutputValues({}); setDuration(null);
      setIsTesting(false); setShowJsonEditor(false); setJsonPaste("");
      setHRegion(""); setHOperator(""); setHStatus(""); setApplied({ region: "", operator: "", status: "" }); setDetailRecord(null);
    }
  }, [open, row?.id]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape" && !detailRecord && !showJsonEditor) onClose(); };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [open, onClose, detailRecord, showJsonEditor]);

  if (!open || !row) return null;

  const selectedSubRow = row.subRows.find(s => s.region === testRegion);
  const inputParams    = selectedSubRow?.inputParams ?? [];
  const outputParams   = selectedSubRow?.outputParams ?? [];

  const handleRegionChange = (r: string) => { setTestRegion(r); setInputValues({}); setOutputValues({}); setDuration(null); };

  const handleApplyJson = () => {
    try {
      const parsed = JSON.parse(jsonPaste);
      if (typeof parsed === "object" && parsed !== null) {
        const vals: Record<string, string> = {};
        Object.entries(parsed).forEach(([k, v]) => { vals[k] = String(v); });
        setInputValues(prev => ({ ...prev, ...vals }));
      }
      setShowJsonEditor(false); setJsonPaste("");
    } catch { /* ignore */ }
  };

  const handleTest = () => {
    if (!testRegion) return;
    setIsTesting(true); setOutputValues({}); setDuration(null);
    const ms = 120 + Math.floor(Math.random() * 380);
    setTimeout(() => {
      const out: Record<string, string> = {};
      outputParams.forEach(p => { out[p.name] = (p.dataType === "int" || p.dataType === "long") ? String(Math.floor(Math.random() * 100)) : `mock_${p.name}`; });
      setOutputValues(out); setDuration(ms); setIsTesting(false);
    }, ms);
  };

  const rawHistory     = MOCK_TEST_HISTORY[row.id] ?? [];
  const displayHistory = rawHistory.filter(r => {
    if (applied.region   && r.region   !== applied.region)          return false;
    if (applied.operator && !r.operator.includes(applied.operator)) return false;
    if (applied.status   && r.status   !== applied.status)          return false;
    return true;
  });

  const handleQuery     = () => setApplied({ region: hRegion, operator: hOperator, status: hStatus });
  const handleHistReset = () => { setHRegion(""); setHOperator(""); setHStatus(""); setApplied({ region: "", operator: "", status: "" }); };
  const handleLoadRecord = (rec: TestHistoryRecord) => { setTestRegion(rec.region); setInputValues(rec.input); setOutputValues({}); setDuration(null); setTab("new"); };

  const inBase  = "w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all bg-white text-slate-700 placeholder:text-slate-300";
  const selBase = "w-full appearance-none px-3 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all bg-white text-slate-700";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-4xl mx-4 max-h-[88vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center"><FlaskConical className="w-4 h-4 text-white" /></div>
            <h2 className="text-slate-800 text-sm">{row.featureSource} — Test</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex border-b border-slate-100 px-6 flex-shrink-0">
          {(["new", "history"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`relative px-1 py-3 mr-7 text-sm transition-colors ${tab === t ? "text-teal-600" : "text-slate-500 hover:text-slate-700"}`}>
              {t === "new" ? "New Test" : "History"}
              {tab === t && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-500 rounded-full" />}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-hidden flex flex-col">
          {tab === "new" && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                <div className="flex items-center gap-3">
                  <label className="text-sm text-slate-600 whitespace-nowrap flex-shrink-0"><span className="text-red-400 mr-0.5">*</span>Region:</label>
                  <div className="relative w-64">
                    <select value={testRegion} onChange={e => handleRegionChange(e.target.value)} className={selBase}>
                      <option value="">Please select</option>
                      {row.subRows.map(s => <option key={s.id} value={s.region}>{s.region} ({s.version})</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                  <button onClick={() => setShowJsonEditor(true)} className="ml-auto flex items-center gap-1.5 px-4 py-1.5 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all">
                    <Code2 className="w-3.5 h-3.5" />Set Input By JSON
                  </button>
                </div>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-5 pt-3 pb-2">
                    <p className="text-xs text-slate-500 mb-2">Input Params:</p>
                    {inputParams.length > 0 ? (
                      <table className="w-full">
                        <thead><tr>{["Name", "Type", "Value"].map(h => <th key={h} className="text-left text-xs text-slate-500 pb-2 pr-4">{h}</th>)}</tr></thead>
                        <tbody className="divide-y divide-slate-100">
                          {inputParams.map(p => (
                            <tr key={p.name}>
                              <td className="py-2.5 pr-4 text-xs text-slate-700 whitespace-nowrap w-44">{p.name}</td>
                              <td className="py-2.5 pr-4 text-xs text-violet-600 w-20">{p.dataType}</td>
                              <td className="py-2.5"><input type="text" value={inputValues[p.name] ?? ""} onChange={e => setInputValues(prev => ({ ...prev, [p.name]: e.target.value }))} className={inBase} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="text-xs text-slate-400 py-3">Select a Region to load input params</p>
                    )}
                  </div>
                  <div className="border-t border-slate-100" />
                  <div className="px-5 pt-3 pb-4">
                    <p className="text-xs text-slate-500 mb-2">Output Params:</p>
                    {Object.keys(outputValues).length > 0 ? (
                      <table className="w-full">
                        <thead><tr>{["Name", "Type", "Value"].map(h => <th key={h} className="text-left text-xs text-slate-500 pb-2 pr-4">{h}</th>)}</tr></thead>
                        <tbody className="divide-y divide-slate-100">
                          {outputParams.map(p => (
                            <tr key={p.name}>
                              <td className="py-2.5 pr-4 text-xs text-slate-700 whitespace-nowrap w-44">{p.name}</td>
                              <td className="py-2.5 pr-4 text-xs text-violet-600 w-20">{p.dataType}</td>
                              <td className="py-2.5 text-xs text-slate-600 font-mono">{outputValues[p.name] ?? ""}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="text-xs text-slate-400 py-3">{isTesting ? "Running test..." : "Run a test to see output params"}</p>
                    )}
                  </div>
                </div>
                {duration !== null && (
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-xs text-slate-500">Completed in <strong className="text-slate-700">{duration}ms</strong></span>
                  </div>
                )}
              </div>
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/40 flex-shrink-0 flex justify-end">
                <button onClick={handleTest} disabled={!testRegion || isTesting} className="flex items-center gap-2 px-6 py-2 text-sm text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                  <Play className="w-3.5 h-3.5" />{isTesting ? "Running…" : "Run Test"}
                </button>
              </div>
            </div>
          )}
          {tab === "history" && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-slate-100 flex-shrink-0">
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-500 whitespace-nowrap">Region:</label>
                    <div className="relative flex-1">
                      <select value={hRegion} onChange={e => setHRegion(e.target.value)} className={selBase}>
                        <option value="">All</option>
                        {row.subRows.map(s => <option key={s.id} value={s.region}>{s.region}</option>)}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-500 whitespace-nowrap">Operator:</label>
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input value={hOperator} onChange={e => setHOperator(e.target.value)} placeholder="Search" className={`${inBase} pl-8`} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-500 whitespace-nowrap">Status:</label>
                    <div className="relative flex-1">
                      <select value={hStatus} onChange={e => setHStatus(e.target.value as "" | "Success" | "Failed")} className={selBase}>
                        <option value="">All</option>
                        <option value="Success">Success</option>
                        <option value="Failed">Failed</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-3">
                  <button onClick={handleHistReset} className="flex items-center gap-1.5 px-4 py-1.5 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all"><RotateCcw className="w-3 h-3" />Reset</button>
                  <button onClick={handleQuery} className="flex items-center gap-1.5 px-4 py-1.5 text-xs text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-all"><Search className="w-3 h-3" />Query</button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-50 z-10">
                    <tr>{["Region", "CreateTime", "Operator", "Status", "Action"].map(h => <th key={h} className="px-5 py-3 text-left text-xs text-slate-400 whitespace-nowrap border-b border-slate-200">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {displayHistory.length === 0 ? (
                      <tr><td colSpan={5} className="px-5 py-8 text-center text-xs text-slate-400">No history records found</td></tr>
                    ) : displayHistory.map((rec, i) => (
                      <tr key={rec.id} className={`${i % 2 === 0 ? "bg-white" : "bg-slate-50/50"} hover:bg-teal-50/30 transition-colors`}>
                        <td className="px-5 py-3 text-xs whitespace-nowrap"><span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-teal-50 text-teal-700 border border-teal-200 font-mono">{rec.region}</span></td>
                        <td className="px-5 py-3 text-xs text-slate-500 whitespace-nowrap">{rec.createTime}</td>
                        <td className="px-5 py-3 text-xs text-slate-600 max-w-[180px] truncate">{rec.operator}</td>
                        <td className="px-5 py-3">
                          {rec.status === "Success"
                            ? <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" />Success</span>
                            : <span className="inline-flex items-center gap-1 text-xs text-red-500"><XCircle className="w-3.5 h-3.5" />Failed</span>}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <button onClick={() => setDetailRecord(rec)} className="text-xs text-teal-600 hover:text-teal-800 transition-colors">Detail</button>
                            <button onClick={() => handleLoadRecord(rec)} className="text-xs text-slate-500 hover:text-slate-700 transition-colors">Load</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Set Input By JSON overlay */}
        {showJsonEditor && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 rounded-2xl" onClick={() => setShowJsonEditor(false)}>
            <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-96 p-5 space-y-3" onClick={e => e.stopPropagation()}>
              <h3 className="text-sm text-slate-800">Set Input Params By JSON</h3>
              <p className="text-xs text-slate-400">Paste a JSON object — matching param keys will be auto-filled.</p>
              <textarea rows={8} value={jsonPaste} onChange={e => setJsonPaste(e.target.value)} placeholder={'{\n  "user_id": "U123456"\n}'} className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 resize-none" spellCheck={false} />
              <div className="flex justify-end gap-2">
                <button onClick={() => { setShowJsonEditor(false); setJsonPaste(""); }} className="px-3 py-1.5 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
                <button onClick={handleApplyJson} className="px-4 py-1.5 text-xs text-white bg-teal-600 hover:bg-teal-700 rounded-lg">Apply</button>
              </div>
            </div>
          </div>
        )}

        {/* Detail panel */}
        {detailRecord && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 rounded-2xl" onClick={() => setDetailRecord(null)}>
            <div className="bg-white rounded-xl shadow-xl border border-slate-100 w-[500px] max-h-[76vh] flex flex-col overflow-hidden mx-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <h3 className="text-slate-800 text-sm">Test Details</h3>
                <button onClick={() => setDetailRecord(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"><X className="w-4 h-4" /></button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-teal-600">Input:</span>
                    <button onClick={() => { navigator.clipboard.writeText(JSON.stringify(detailRecord.input, null, 2)); setCopiedInput(true); setTimeout(() => setCopiedInput(false), 2000); }} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700">
                      <Copy className="w-3.5 h-3.5" />{copiedInput ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <pre className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs font-mono text-slate-700 whitespace-pre overflow-x-auto max-h-56">{JSON.stringify(detailRecord.input, null, 2)}</pre>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-emerald-600">Output:</span>
                    <button onClick={() => { navigator.clipboard.writeText(JSON.stringify(detailRecord.output, null, 2)); setCopiedOutput(true); setTimeout(() => setCopiedOutput(false), 2000); }} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700">
                      <Copy className="w-3.5 h-3.5" />{copiedOutput ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <pre className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs font-mono text-slate-700 whitespace-pre overflow-x-auto max-h-56">{Object.keys(detailRecord.output).length > 0 ? JSON.stringify(detailRecord.output, null, 2) : "{}"}</pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function FeatureSourcePage() {
  const [tableData, setTableData]         = useState<FeatureRow[]>(INITIAL_DATA);
  const [featureSource, setFeatureSource] = useState("");
  const [sourceType, setSourceType]       = useState("");
  const [region, setRegion]               = useState("");
  const [creator, setCreator]             = useState("");
  const [filterExpanded, setFilterExpanded] = useState(true);
  const [expandedRows, setExpandedRows]   = useState<Set<string>>(new Set(["1", "2"]));
  const [currentPage, setCurrentPage]     = useState(1);
  const [pageSize, setPageSize]           = useState(20);
  const [modal, setModal]                 = useState<ModalState>({ open: false, type: "warning", title: "", body: null });
  const [metaFormModal, setMetaFormModal] = useState<{ open: boolean; mode: "add" | "editMeta"; row?: FeatureRow }>({ open: false, mode: "add" });
  const [regionFormModal, setRegionFormModal] = useState<{ open: boolean; mode: RegionFormMode; parentRow?: FeatureRow; subRow?: SubRow }>({ open: false, mode: "add" });
  const [viewModal, setViewModal]         = useState<{ open: boolean; parentRow?: FeatureRow; subRow?: SubRow }>({ open: false });
  const [testModal, setTestModal]         = useState<{ open: boolean; row: FeatureRow | null }>({ open: false, row: null });
  const [lineageModal, setLineageModal]   = useState<{ open: boolean; parentRow?: FeatureRow; subRow?: SubRow }>({ open: false });

  const closeModal      = () => setModal(m => ({ ...m, open: false }));
  const closeMetaForm   = () => setMetaFormModal({ open: false, mode: "add" });
  const closeRegionForm = () => setRegionFormModal({ open: false, mode: "add" });
  const closeViewModal  = () => setViewModal({ open: false });

  const toggleRow  = (id: string) => setExpandedRows(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const handleReset = () => { setFeatureSource(""); setSourceType(""); setRegion(""); setCreator(""); };

  const handleOpenAdd      = () => setMetaFormModal({ open: true, mode: "add" });
  const handleOpenEditMeta = (row: FeatureRow) => setMetaFormModal({ open: true, mode: "editMeta", row });
  const handleRowAdd       = (row: FeatureRow) => setRegionFormModal({ open: true, mode: "add", parentRow: row });
  const handleSubEdit      = (parentRow: FeatureRow, subRow: SubRow) => setRegionFormModal({ open: true, mode: "edit", parentRow, subRow });
  const handleSubView      = (parentRow: FeatureRow, subRow: SubRow) => setViewModal({ open: true, parentRow, subRow });
  const handleSubCopy      = (parentRow: FeatureRow, subRow: SubRow) => setRegionFormModal({ open: true, mode: "copy", parentRow, subRow });
  const handleSubLineage   = (parentRow: FeatureRow, subRow: SubRow) => setLineageModal({ open: true, parentRow, subRow });

  const handleMetaSubmit = (data: MetaFormData, mode: "add" | "editMeta", rowId?: string) => {
    if (mode === "add") {
      setTableData(prev => [...prev, {
        id: String(Date.now()), featureSource: data.featureSource, sourceType: data.sourceType,
        dataLatency: data.dataLatency, regions: [], creator: "current.user@seamoney.com",
        createTime: nowString(), description: data.description || "—", subRows: [],
      }]);
    } else if (mode === "editMeta" && rowId) {
      setTableData(prev => prev.map(row => row.id !== rowId ? row : {
        ...row, sourceType: data.sourceType, dataLatency: data.dataLatency, description: data.description,
      }));
    }
  };

  const handleRegionSubmit = (data: RegionFormData, mode: RegionFormMode) => {
    const parentRow    = regionFormModal.parentRow;
    const editingSubRow = regionFormModal.subRow;
    if (!parentRow) return;
    if (mode === "add") {
      const newSubId = `${parentRow.id}-${Date.now()}`;
      setTableData(prev => prev.map(row => {
        if (row.id !== parentRow.id) return row;
        return {
          ...row,
          regions: row.regions.includes(data.region) ? row.regions : [...row.regions, data.region],
          subRows: [...row.subRows, { id: newSubId, region: data.region, version: data.version, scriptType: data.scriptType, callFunction: data.callFunction, inputParams: data.inputParams, outputParams: data.outputParams, status: "DRAFT", updateTime: nowString(), sourcePipeline: "No Records" as const }],
        };
      }));
    } else if (mode === "edit" && editingSubRow) {
      setTableData(prev => prev.map(row => {
        if (row.id !== parentRow.id) return row;
        return { ...row, subRows: row.subRows.map(sub => sub.id !== editingSubRow.id ? sub : { ...sub, scriptType: data.scriptType, callFunction: data.callFunction, inputParams: data.inputParams, outputParams: data.outputParams, updateTime: nowString() }) };
      }));
    } else if (mode === "copy") {
      const newSubId = `${parentRow.id}-${Date.now()}`;
      setTableData(prev => prev.map(row => {
        if (row.id !== parentRow.id) return row;
        return {
          ...row,
          regions: row.regions.includes(data.region) ? row.regions : [...row.regions, data.region],
          subRows: [...row.subRows, { id: newSubId, region: data.region, version: data.version, scriptType: data.scriptType, callFunction: data.callFunction, inputParams: data.inputParams, outputParams: data.outputParams, status: "DRAFT", updateTime: nowString(), sourcePipeline: "No Records" as const }],
        };
      }));
    }
  };

  const handleStatusChange = (parentId: string, subRowId: string, newStatus: SubStatus) => {
    setTableData(prev => prev.map(row => {
      if (row.id !== parentId) return row;
      return { ...row, subRows: row.subRows.map(sub => sub.id !== subRowId ? sub : { ...sub, status: newStatus, updateTime: nowString() }) };
    }));
  };

  const handlePrimaryDelete = (row: FeatureRow) => {
    if (row.subRows.length > 0) {
      setModal({
        open: true, type: "warning", title: "Cannot Delete Feature Source",
        body: (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              <code className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 text-xs font-mono">{row.featureSource}</code>{" "}
              still has <strong>{row.subRows.length}</strong> region config{row.subRows.length > 1 ? "s" : ""}. Please remove all region configs first.
            </p>
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 space-y-1.5">
              <p className="text-xs text-amber-700 mb-2">Regions to remove first:</p>
              {row.subRows.map(s => (
                <div key={s.id} className="flex items-center justify-between text-xs">
                  <span className="text-slate-700">{s.region} <span className="text-slate-400 font-mono">{s.version}</span></span>
                  <StatusBadge status={s.status} />
                </div>
              ))}
            </div>
          </div>
        ),
      });
    }
  };

  // Filter logic
  const filteredData = tableData.filter(row => {
    if (featureSource && !row.featureSource.toLowerCase().includes(featureSource.toLowerCase())) return false;
    if (sourceType && row.sourceType !== sourceType) return false;
    if (region && !row.regions.includes(region)) return false;
    if (creator && !row.creator.toLowerCase().includes(creator.toLowerCase())) return false;
    return true;
  });

  const totalFiltered = filteredData.length;
  const totalPages    = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const paginated     = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const activeFilters = [featureSource, sourceType, region, creator].filter(Boolean).length;

  // Region status helper for main table tags
  const getRegionStatus = (row: FeatureRow, regionCode: string): SubStatus | undefined => {
    const sub = row.subRows.find(s => s.region === regionCode);
    return sub?.status;
  };

  const inputCls = "w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-100 transition-all text-slate-700 placeholder:text-slate-300 bg-white";

  return (
    <div className="min-h-screen bg-[#f5f6f8]">
      {/* Modals */}
      <Modal state={modal} onClose={closeModal} />
      <MetaFormModal open={metaFormModal.open} mode={metaFormModal.mode} row={metaFormModal.row} onClose={closeMetaForm} onSubmit={handleMetaSubmit} />
      {regionFormModal.parentRow && (
        <RegionFormModal open={regionFormModal.open} mode={regionFormModal.mode} parentRow={regionFormModal.parentRow} subRow={regionFormModal.subRow} onClose={closeRegionForm} onSubmit={handleRegionSubmit} />
      )}
      {viewModal.open && viewModal.parentRow && viewModal.subRow && (
        <ViewRegionModal open={viewModal.open} parentRow={viewModal.parentRow} subRow={viewModal.subRow} onClose={closeViewModal} />
      )}
      <TestModal open={testModal.open} row={testModal.row} onClose={() => setTestModal({ open: false, row: null })} />
      {lineageModal.open && lineageModal.parentRow && lineageModal.subRow && (
        <LineageModal open={lineageModal.open} parentRow={lineageModal.parentRow} subRow={lineageModal.subRow} onClose={() => setLineageModal({ open: false })} />
      )}

      {/* Page Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-3.5">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-400">Feature Platform</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          <span className="text-slate-700">Feature Source</span>
        </div>
      </div>

      <div className="p-5 space-y-3">
        {/* Filter Bar */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <button
            onClick={() => setFilterExpanded(v => !v)}
            className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50/60 transition-colors"
          >
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-600">Filter</span>
              {activeFilters > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs bg-teal-500 text-white">{activeFilters}</span>
              )}
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${filterExpanded ? "rotate-180" : ""}`} />
          </button>

          {filterExpanded && (
            <div className="border-t border-slate-100 px-5 py-4">
              <div className="grid grid-cols-4 gap-4">
                {/* Feature Source */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-500">Feature Source</label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input value={featureSource} onChange={e => { setFeatureSource(e.target.value); setCurrentPage(1); }}
                      placeholder="Search name..." className={`${inputCls} pl-8`} />
                  </div>
                </div>
                {/* Source Type */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-500">Source Type</label>
                  <div className="relative">
                    <select value={sourceType} onChange={e => { setSourceType(e.target.value); setCurrentPage(1); }} className={`appearance-none pr-9 ${inputCls}`}>
                      <option value="">All</option>
                      {SOURCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                {/* Region */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-500">Region</label>
                  <div className="relative">
                    <select value={region} onChange={e => { setRegion(e.target.value); setCurrentPage(1); }} className={`appearance-none pr-9 ${inputCls}`}>
                      <option value="">All</option>
                      {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                {/* Creator */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-500">Creator</label>
                  <input value={creator} onChange={e => { setCreator(e.target.value); setCurrentPage(1); }}
                    placeholder="Search creator..." className={inputCls} />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button onClick={handleReset} className="flex items-center gap-1.5 px-4 py-1.5 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all">
                  <RotateCcw className="w-3.5 h-3.5" />Reset
                </button>
                <button className="flex items-center gap-1.5 px-4 py-1.5 text-sm text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-all shadow-sm">
                  <Search className="w-3.5 h-3.5" />Search
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-sm text-slate-600">Total <strong className="text-slate-800">{totalFiltered}</strong> records</span>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all" title="Refresh">
                <RefreshCw className="w-4 h-4" />
              </button>
              <button className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all" title="Column settings">
                <Columns3 className="w-4 h-4" />
              </button>
              <div className="w-px h-5 bg-slate-200 mx-1" />
              <button onClick={handleOpenAdd}
                className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition-all">
                <Plus className="w-4 h-4" />Add Feature Source
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="w-10" />
                  {["Feature Source", "Source Type", "Data Latency", "Region", "Creator", "CreateTime", "Description", "Action"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs text-slate-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-12 text-center text-sm text-slate-400">
                      No data found. Try adjusting your filters.
                    </td>
                  </tr>
                ) : paginated.map((row, rowIdx) => {
                  const isExpanded = expandedRows.has(row.id);
                  return (
                    <Fragment key={row.id}>
                      {/* Primary Row */}
                      <tr className={`border-b border-slate-100 hover:bg-slate-50/60 transition-colors ${rowIdx % 2 === 0 ? "bg-white" : "bg-slate-50/30"}`}>
                        {/* Expand toggle */}
                        <td className="px-4 py-3 w-10">
                          <button
                            onClick={() => toggleRow(row.id)}
                            className="w-5 h-5 rounded flex items-center justify-center border border-slate-300 text-slate-500 hover:border-teal-400 hover:text-teal-600 transition-all"
                          >
                            {isExpanded
                              ? <span className="text-[11px] leading-none">−</span>
                              : <span className="text-[11px] leading-none">+</span>
                            }
                          </button>
                        </td>
                        {/* Feature Source */}
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-800 font-mono whitespace-nowrap">{row.featureSource}</span>
                        </td>
                        {/* Source Type */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <SourceTypeBadge type={row.sourceType} />
                        </td>
                        {/* Data Latency */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <LatencyBadge latency={row.dataLatency} />
                        </td>
                        {/* Regions */}
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {row.regions.map(r => (
                              <RegionTag key={r} region={r} status={getRegionStatus(row, r)} />
                            ))}
                          </div>
                        </td>
                        {/* Creator */}
                        <td className="px-4 py-3 text-xs text-slate-500 max-w-[160px] truncate whitespace-nowrap">{row.creator}</td>
                        {/* CreateTime */}
                        <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{row.createTime}</td>
                        {/* Description */}
                        <td className="px-4 py-3 text-xs text-slate-500 max-w-[180px] truncate">{row.description}</td>
                        {/* Action */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <button onClick={() => handleRowAdd(row)} className="text-xs text-teal-600 hover:text-teal-800 transition-colors">Add</button>
                            <span className="text-slate-200">|</span>
                            <button onClick={() => handleOpenEditMeta(row)} className="text-xs text-teal-600 hover:text-teal-800 transition-colors">Edit</button>
                            <span className="text-slate-200">|</span>
                            <button onClick={() => setTestModal({ open: true, row })} className="text-xs text-teal-600 hover:text-teal-800 transition-colors">Test</button>
                            <span className="text-slate-200">|</span>
                            <button onClick={() => handlePrimaryDelete(row)} className="text-xs text-red-400 hover:text-red-600 transition-colors">Delete</button>
                          </div>
                        </td>
                      </tr>

                      {/* Sub-table */}
                      {isExpanded && row.subRows.length > 0 && (
                        <tr key={`${row.id}-sub`}>
                          <td colSpan={9} className="p-0">
                            <SubTable
                              rows={row.subRows}
                              sourceType={row.sourceType}
                              onStatusChange={(subRowId, newStatus) => handleStatusChange(row.id, subRowId, newStatus)}
                              onEdit={(subRow) => handleSubEdit(row, subRow)}
                              onView={(subRow) => handleSubView(row, subRow)}
                              onCopy={(subRow) => handleSubCopy(row, subRow)}
                              onLineage={(subRow) => handleSubLineage(row, subRow)}
                            />
                          </td>
                        </tr>
                      )}
                      {isExpanded && row.subRows.length === 0 && (
                        <tr key={`${row.id}-empty`}>
                          <td colSpan={9} className="p-0">
                            <div className="border-t border-slate-100 bg-slate-50/40 px-6 py-4 text-xs text-slate-400 text-center">
                              No region configs yet.{" "}
                              <button onClick={() => handleRowAdd(row)} className="text-teal-600 hover:underline">Add one</button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100">
            <span className="text-xs text-slate-400">
              {totalFiltered === 0 ? "0 items" : `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, totalFiltered)} of ${totalFiltered} items`}
            </span>
            <div className="flex items-center gap-2">
              {/* Page buttons */}
              <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="p-1.5 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              {/* Page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let page: number;
                if (totalPages <= 5) page = i + 1;
                else if (currentPage <= 3) page = i + 1;
                else if (currentPage >= totalPages - 2) page = totalPages - 4 + i;
                else page = currentPage - 2 + i;
                return (
                  <button key={page} onClick={() => setCurrentPage(page)}
                    className={`w-7 h-7 rounded text-xs transition-colors ${currentPage === page ? "bg-teal-600 text-white" : "text-slate-500 hover:bg-slate-100"}`}>
                    {page}
                  </button>
                );
              })}
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="p-1.5 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
              {/* Page size */}
              <div className="relative ml-2">
                <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                  className="appearance-none pl-3 pr-8 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-teal-400 bg-white text-slate-600 transition-all">
                  {[10, 20, 50, 100].map(s => <option key={s} value={s}>{s} / page</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
