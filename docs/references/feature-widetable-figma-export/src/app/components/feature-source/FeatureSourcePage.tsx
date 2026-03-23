import { useState, useEffect, useRef, Fragment, useMemo } from "react";
import {
  Search,
  RotateCcw,
  Plus,
  RefreshCw,
  ChevronDown,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  ChevronRight,
  Minus,
  Database,
  Layers,
  Zap,
  Globe,
  AlertTriangle,
  X,
  Trash2,
  Link2,
  CheckCircle2,
  XCircle,
  Settings,
  ToggleLeft,
  Code2,
  Info,
  FlaskConical,
  Play,
  Copy,
  FileEdit,
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
  callFunction: string;
  inputParams: ParamRow[];
  outputParams: ParamRow[];
  status: SubStatus;
  updateTime: string;
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
  inputParams: ParamRow[];
  callFunction: string;
  outputParams: ParamRow[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DATA_TYPES = ["string", "int", "long", "double", "float", "boolean", "list", "map", "json"];

const p = (name: string, dataType = "string"): ParamRow => ({ name, dataType });

const CF = {
  hbase_id:  JSON.stringify({ table_name: "credit_user_risk_id",   qualifier: "cf:risk_score",   row_missing_value: -1, value_missing_value: -1, output_values: ["risk_score", "raw_map"] }, null, 2),
  hbase_th:  JSON.stringify({ table_name: "credit_user_risk_th",   qualifier: "cf:data_status",  row_missing_value: -1, value_missing_value: -1, output_values: ["raw_map", "data_status"] }, null, 2),
  grpc_mx:   JSON.stringify({ table_name: "acard_realtime_mx",     qualifier: "svc:predict",     row_missing_value: -1, value_missing_value: -1, output_values: ["acard_score", "acard_tier"] }, null, 2),
  grpc_id:   JSON.stringify({ table_name: "acard_realtime_id",     qualifier: "svc:predict",     row_missing_value: -1, value_missing_value: -1, output_values: ["acard_score", "acard_tier"] }, null, 2),
  redis_sg:  JSON.stringify({ table_name: "recommend_v2_sg",       qualifier: "cf:item_list",    row_missing_value: -1, value_missing_value: -1, output_values: ["item_list", "score_map"] }, null, 2),
  nebula_th: JSON.stringify({ table_name: "relation_graph_th",     qualifier: "cf:node_list",    row_missing_value: -1, value_missing_value: -1, output_values: ["node_list", "edge_list", "relation_score"] }, null, 2),
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
    description: "HBase-based user risk score f...",
    subRows: [
      {
        id: "1-1", region: "ID", version: "V1", callFunction: CF.hbase_id,
        inputParams: [p("user_id"), p("id_card_no"), p("platform_user_id")],
        outputParams: [p("raw_map", "map"), p("risk_score", "int")],
        status: "ENABLE", updateTime: "2026-02-16 14:00",
      },
      {
        id: "1-2", region: "TH", version: "V1", callFunction: CF.hbase_th,
        inputParams: [p("user_id")],
        outputParams: [p("raw_map", "map"), p("data_status", "int")],
        status: "DRAFT", updateTime: "2026-02-15 10:30",
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
    description: "gRPC-based realtime Acard sc...",
    subRows: [
      {
        id: "2-1", region: "MX", version: "V2", callFunction: CF.grpc_mx,
        inputParams: [p("id_card_no"), p("platform_user_id"), p("phone_number")],
        outputParams: [p("acard_score", "int"), p("acard_tier", "string")],
        status: "ENABLE", updateTime: "2026-02-14 18:45",
      },
      {
        id: "2-2", region: "ID", version: "V1", callFunction: CF.grpc_id,
        inputParams: [p("id_card_no"), p("platform_user_id")],
        outputParams: [p("acard_score", "int"), p("acard_tier", "string")],
        status: "DISABLE", updateTime: "2026-02-13 16:00",
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
    description: "Redis-backed recommendation...",
    subRows: [
      {
        id: "3-1", region: "SHOPEE_SG", version: "V1", callFunction: CF.redis_sg,
        inputParams: [p("user_id"), p("scene_id")],
        outputParams: [p("item_list", "list"), p("score_map", "map")],
        status: "ENABLE", updateTime: "2026-02-05 09:20",
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
    description: "Graph DB relation features fro...",
    subRows: [
      {
        id: "4-1", region: "TH", version: "V1", callFunction: CF.nebula_th,
        inputParams: [p("user_id"), p("depth", "int"), p("relation_type")],
        outputParams: [p("node_list", "list"), p("edge_list", "list"), p("relation_score", "int")],
        status: "DISABLE", updateTime: "2026-02-12 22:10",
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

const SOURCE_TYPES = ["HBase", "gRPC", "Redis", "GraphDB", "MySQL", "Kafka"];
const REGIONS = ["ID", "TH", "MX", "SG", "PH", "VN", "SHOPEE_SG"];
const DATA_LATENCY_OPTIONS = ["Online", "Nearline", "Offline"];

const CF_TEMPLATE: Record<string, object> = {
  HBase:   { table_name: "", qualifier: "cf:score",   row_missing_value: -1, value_missing_value: -1, output_values: [] },
  gRPC:    { table_name: "", qualifier: "svc:predict", row_missing_value: -1, value_missing_value: -1, output_values: [] },
  Redis:   { table_name: "", qualifier: "cf:value",   row_missing_value: -1, value_missing_value: -1, output_values: [] },
  GraphDB: { table_name: "", qualifier: "cf:node",    row_missing_value: -1, value_missing_value: -1, output_values: [] },
  MySQL:   { table_name: "", qualifier: "col:value",  row_missing_value: -1, value_missing_value: -1, output_values: [] },
  Kafka:   { table_name: "", qualifier: "topic:key",  row_missing_value: -1, value_missing_value: -1, output_values: [] },
};

const sourceTypeIconMap: Record<string, React.ReactNode> = {
  HBase: <Database className="w-3.5 h-3.5" />,
  gRPC: <Zap className="w-3.5 h-3.5" />,
  Redis: <Database className="w-3.5 h-3.5" />,
  GraphDB: <Globe className="w-3.5 h-3.5" />,
};

const SOURCE_TYPE_CALL_LABEL: Record<string, string> = {
  HBase:   "HBaseCall",
  gRPC:    "grpcCall",
  Redis:   "RedisCall",
  GraphDB: "NebulaCall",
  MySQL:   "MysqlCall",
  Kafka:   "KafkaCall",
};

function nowString() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function tryParseJson(str: string): { ok: boolean; parsed: unknown } {
  try { return { ok: true, parsed: JSON.parse(str) }; }
  catch { return { ok: false, parsed: null }; }
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
    { id: "h1-1", region: "ID", createTime: "2026-02-20 14:38:50.000", operator: "cedric.chencan@seamoney.com",  status: "Success", input: { user_id: "U883421", id_card_no: "3201011990xxxxxx", platform_user_id: "SPay_ID_883421" }, output: { raw_map: '{"level":"low","detail":"ok"}', risk_score: "72" } },
    { id: "h1-2", region: "ID", createTime: "2026-02-20 14:38:49.000", operator: "cedric.chencan@seamoney.com",  status: "Success", input: { user_id: "U662201", id_card_no: "3172021985xxxxxx", platform_user_id: "SPay_ID_662201" }, output: { raw_map: '{"level":"medium"}', risk_score: "48" } },
    { id: "h1-3", region: "TH", createTime: "2026-02-18 10:15:30.000", operator: "zhengyi.loh@seamoney.com",    status: "Success", input: { user_id: "U_TH_77821" }, output: { raw_map: '{"level":"high"}', data_status: "1" } },
    { id: "h1-4", region: "ID", createTime: "2026-02-15 09:20:10.000", operator: "cedric.chencan@seamoney.com",  status: "Failed",  input: { user_id: "U_INVALID", id_card_no: "", platform_user_id: "" }, output: {} },
    { id: "h1-5", region: "TH", createTime: "2026-02-10 16:45:22.000", operator: "wanhao@shopee.com",           status: "Success", input: { user_id: "U_TH_55100" }, output: { raw_map: '{"level":"low"}', data_status: "0" } },
  ],
  "2": [
    { id: "h2-1", region: "MX", createTime: "2026-02-21 11:30:00.000", operator: "zhengyi.loh@seamoney.com",    status: "Success", input: { id_card_no: "MX19921010xxx", platform_user_id: "Spay_MX_441", phone_number: "+521234567890" }, output: { acard_score: "88", acard_tier: "A" } },
    { id: "h2-2", region: "MX", createTime: "2026-02-19 08:50:30.000", operator: "zhengyi.loh@seamoney.com",    status: "Success", input: { id_card_no: "MX19880205xxx", platform_user_id: "Spay_MX_332", phone_number: "+529876543210" }, output: { acard_score: "61", acard_tier: "B" } },
    { id: "h2-3", region: "ID", createTime: "2026-02-18 14:12:55.000", operator: "cedric.chencan@seamoney.com",  status: "Failed",  input: { id_card_no: "3201INVALID",  platform_user_id: "" }, output: {} },
    { id: "h2-4", region: "ID", createTime: "2026-01-30 17:05:40.000", operator: "wanhao@shopee.com",           status: "Success", input: { id_card_no: "3201011985xxxxxx", platform_user_id: "SPay_ID_220411" }, output: { acard_score: "75", acard_tier: "A" } },
  ],
  "3": [
    { id: "h3-1", region: "SHOPEE_SG", createTime: "2026-02-22 10:00:00.000", operator: "huangwei@shopee.com",  status: "Success", input: { user_id: "SG_USER_9921", scene_id: "homepage_feed" },  output: { item_list: '["item_001","item_002"]', score_map: '{"item_001":0.92}' } },
    { id: "h3-2", region: "SHOPEE_SG", createTime: "2026-02-21 15:30:10.000", operator: "huangwei@shopee.com",  status: "Success", input: { user_id: "SG_USER_7712", scene_id: "search_result" }, output: { item_list: '["item_055","item_060"]', score_map: '{"item_055":0.95}' } },
    { id: "h3-3", region: "SHOPEE_SG", createTime: "2026-02-10 09:22:00.000", operator: "linhai.liu@shopee.com", status: "Failed",  input: { user_id: "", scene_id: "homepage_feed" }, output: {} },
  ],
  "4": [
    { id: "h4-1", region: "TH", createTime: "2026-02-20 13:45:00.000", operator: "cedric.chencan@seamoney.com", status: "Success", input: { user_id: "TH_USER_4421", depth: "2", relation_type: "transfer" }, output: { node_list: '["node_A","node_B"]', edge_list: '["A->B"]', relation_score: "85" } },
    { id: "h4-2", region: "TH", createTime: "2026-02-15 16:10:30.000", operator: "cedric.chencan@seamoney.com", status: "Success", input: { user_id: "TH_USER_3300", depth: "3", relation_type: "loan" },     output: { node_list: '["node_X","node_Y"]', edge_list: '["X->Y"]', relation_score: "62" } },
  ],
};

// ─── Small Shared Components ──────────────────────────────────────────────────

function RegionTag({ region, status }: { region: string; status?: SubStatus }) {
  const colorCls = status === "ENABLE" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : status === "DISABLE" ? "bg-red-50 text-red-600 border-red-200"
    : "bg-slate-100 text-slate-500 border-slate-200";
  const dotCls = status === "ENABLE" ? "bg-emerald-500" : status === "DISABLE" ? "bg-red-500" : "bg-slate-400";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs border whitespace-nowrap ${colorCls}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotCls}`} />
      {region}
    </span>
  );
}

function StatusBadge({ status }: { status: SubStatus }) {
  if (status === "ENABLE")
    return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-emerald-50 text-emerald-700 border border-emerald-200"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />ENABLE</span>;
  if (status === "DISABLE")
    return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-red-50 text-red-600 border border-red-200"><span className="w-1.5 h-1.5 rounded-full bg-red-500" />DISABLE</span>;
  return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-slate-100 text-slate-500 border border-slate-200"><span className="w-1.5 h-1.5 rounded-full bg-slate-400" />DRAFT</span>;
}

function ParamTag({ label }: { label: string }) {
  return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap">{label}</span>;
}

// ─── Param Row Editor (shared by Add/Edit/Copy/View) ─────────────────────────

function ParamRowEditor({
  params, onChange, disabled = false,
}: {
  params: ParamRow[];
  onChange?: (params: ParamRow[]) => void;
  disabled?: boolean;
}) {
  const addRow = () => onChange?.([...params, { name: "", dataType: "string" }]);
  const removeRow = (i: number) => {
    if (params.length <= 1) return;
    onChange?.(params.filter((_, idx) => idx !== i));
  };
  const updateRow = (i: number, field: keyof ParamRow, val: string) =>
    onChange?.(params.map((r, idx) => idx === i ? { ...r, [field]: val } : r));

  return (
    <div className="space-y-2">
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-3 py-2 text-left text-xs text-slate-500 font-medium">Param Name</th>
              <th className="px-3 py-2 text-left text-xs text-slate-500 font-medium w-32">Data Type</th>
              {!disabled && <th className="px-3 py-2 w-9" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {params.length === 0 && (
              <tr><td colSpan={disabled ? 2 : 3} className="px-3 py-3 text-xs text-slate-300 italic">—</td></tr>
            )}
            {params.map((row, i) => (
              <tr key={i} className="group">
                <td className="px-3 py-2">
                  {disabled ? (
                    <span className="text-xs text-slate-700 font-mono">{row.name || "—"}</span>
                  ) : (
                    <input
                      type="text" value={row.name}
                      onChange={(e) => updateRow(i, "name", e.target.value)}
                      placeholder="param_name"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all font-mono placeholder:text-slate-300 bg-white"
                    />
                  )}
                </td>
                <td className="px-3 py-2 w-32">
                  {disabled ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-emerald-50 text-emerald-600 border border-emerald-200 font-mono">{row.dataType}</span>
                  ) : (
                    <div className="relative">
                      <select
                        value={row.dataType}
                        onChange={(e) => updateRow(i, "dataType", e.target.value)}
                        className="w-full appearance-none px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all bg-white text-slate-700"
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
                      type="button"
                      disabled={params.length <= 1}
                      onClick={() => removeRow(i)}
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
        <button
          type="button" onClick={addRow}
          className="flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-800 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />Add Param
        </button>
      )}
    </div>
  );
}

// ─── Call Function JSON Display ───────────────────────────────────────────────

function CallFunctionDisplay({ value, sourceType }: { value: string; sourceType: string }) {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const { ok, parsed } = tryParseJson(value);
  const pillLabel = SOURCE_TYPE_CALL_LABEL[sourceType] ?? sourceType;

  const handleMouseEnter = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 6, left: rect.left });
    }
    setShow(true);
  };

  return (
    <div ref={ref} className="relative inline-flex items-center gap-1.5" onMouseEnter={handleMouseEnter} onMouseLeave={() => setShow(false)}>
      <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 cursor-default select-none">{pillLabel}</span>
      <Info className="w-3 h-3 text-slate-400 hover:text-teal-500 cursor-pointer flex-shrink-0" />
      {show && pos && (
        <div style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9999 }} className="bg-white border border-slate-200 rounded-xl shadow-xl shadow-slate-200/60 p-3 w-72">
          <div className="flex items-center gap-1.5 mb-2 pb-1.5 border-b border-slate-100">
            <Code2 className="w-3 h-3 text-teal-500" />
            <span className="text-xs text-slate-500">Call Function Config</span>
          </div>
          <pre className="text-[11px] font-mono text-slate-700 whitespace-pre overflow-x-auto leading-relaxed max-h-48 bg-slate-50 rounded-lg p-2.5">
            {ok ? JSON.stringify(parsed, null, 2) : value}
          </pre>
          {!ok && <p className="mt-1.5 text-[10px] text-red-500">⚠ Not valid JSON</p>}
        </div>
      )}
    </div>
  );
}

// ─── JSON Code Editor ─────────────────────────────────────────────────────────

function JsonCodeEditor({ value, onChange, disabled, placeholder }: {
  value: string; onChange: (v: string) => void; disabled?: boolean; placeholder?: string;
}) {
  const { ok } = tryParseJson(value);
  const hasContent = value.trim().length > 0;
  return (
    <div className={`rounded-xl overflow-hidden border transition-all ${
      disabled ? "border-slate-200"
        : !hasContent ? "border-slate-200 focus-within:border-teal-400 focus-within:ring-2 focus-within:ring-teal-100"
        : ok ? "border-emerald-300 focus-within:ring-2 focus-within:ring-emerald-100"
        : "border-red-300 focus-within:ring-2 focus-within:ring-red-100"
    }`}>
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-100 bg-slate-50">
        <div className="flex items-center gap-1.5">
          <span className={`w-2.5 h-2.5 rounded-full ${disabled ? "bg-slate-300" : "bg-red-400"}`} />
          <span className={`w-2.5 h-2.5 rounded-full ${disabled ? "bg-slate-300" : "bg-amber-400"}`} />
          <span className={`w-2.5 h-2.5 rounded-full ${disabled ? "bg-slate-300" : "bg-emerald-400"}`} />
          <span className="ml-2 text-[11px] font-mono text-slate-400">call-function.json</span>
        </div>
        {hasContent && (
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${ok ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-red-50 text-red-500 border-red-200"}`}>
            {ok ? "✓ valid JSON" : "✗ invalid JSON"}
          </span>
        )}
      </div>
      <textarea
        disabled={disabled} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} rows={6} spellCheck={false}
        className={`w-full px-4 py-3 text-xs font-mono resize-none outline-none leading-relaxed ${
          disabled ? "bg-slate-50 text-slate-400 cursor-not-allowed" : "bg-white text-slate-700 placeholder:text-slate-300 caret-teal-500"
        }`}
      />
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
    warning: <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0"><AlertTriangle className="w-5 h-5 text-amber-500" /></div>,
    error:   <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0"><Trash2 className="w-5 h-5 text-red-500" /></div>,
    info:    <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0"><Link2 className="w-5 h-5 text-teal-500" /></div>,
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-md mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">{iconMap[state.type]}<h2 className="text-slate-800">{state.title}</h2></div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-5 py-4">{state.body}</div>
        <div className="flex justify-end px-5 py-4 border-t border-slate-100 bg-slate-50/40">
          <button onClick={onClose} className="px-5 py-2 text-sm text-white bg-gradient-to-r from-teal-500 to-cyan-500 rounded-lg hover:from-teal-600 hover:to-cyan-600 shadow-sm transition-all">Got it</button>
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

  const [form, setForm] = useState<MetaFormData>(buildInitial);
  const [errors, setErrors] = useState<Partial<Record<keyof MetaFormData, string>>>({});

  useEffect(() => { if (open) { setForm(buildInitial()); setErrors({}); } }, [open, mode, row?.id]);
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;

  const validate = (): boolean => {
    const errs: Partial<Record<keyof MetaFormData, string>> = {};
    if (!form.featureSource.trim()) errs.featureSource = "Required";
    else if (/^\d/.test(form.featureSource)) errs.featureSource = "Cannot start with a digit";
    else if (/\s/.test(form.featureSource)) errs.featureSource = "No spaces allowed";
    if (!form.sourceType) errs.sourceType = "Please select Source Type";
    if (!form.dataLatency) errs.dataLatency = "Please select Data Latency";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const set = (field: keyof MetaFormData, val: string) => { setErrors((e) => ({ ...e, [field]: undefined })); setForm((f) => ({ ...f, [field]: val })); };
  const handleSubmit = () => { if (validate()) { onSubmit(form, mode, row?.id); onClose(); } };

  const inputBase    = "w-full px-3 py-2 text-sm border rounded-lg outline-none transition-all placeholder:text-slate-300";
  const inputActive  = "bg-white border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 text-slate-800";
  const inputDisabled = "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed";
  const selectBase   = "w-full appearance-none px-3 py-2 text-sm border rounded-lg outline-none transition-all";
  const labelCls     = "text-sm text-slate-600 text-right whitespace-nowrap pt-2";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-xl mx-4 overflow-hidden max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-white to-teal-50/30 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center shadow-sm shadow-teal-200">
              {isEdit ? <FileEdit className="w-4 h-4 text-white" /> : <Plus className="w-4 h-4 text-white" />}
            </div>
            <h2 className="text-slate-800">{isEdit ? "Edit Feature Source" : "Add Feature Source"}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-[116px_1fr] items-start gap-3">
            <label className={labelCls}>Feature Source: <span className="text-red-400">*</span></label>
            <div>
              <input type="text" disabled={isEdit} value={form.featureSource} onChange={(e) => set("featureSource", e.target.value)} placeholder="不可重复、不可以数字开头" className={`${inputBase} ${isEdit ? inputDisabled : inputActive} ${errors.featureSource ? "border-red-300" : ""}`} />
              {errors.featureSource && <p className="mt-1 text-xs text-red-500">{errors.featureSource}</p>}
            </div>
          </div>
          <div className="grid grid-cols-[116px_1fr] items-start gap-3">
            <label className={labelCls}>SourceType: <span className="text-red-400">*</span></label>
            <div className="relative">
              <select value={form.sourceType} onChange={(e) => set("sourceType", e.target.value)} className={`${selectBase} ${inputActive} ${errors.sourceType ? "border-red-300" : ""}`}>
                <option value="">HBase / Redis / gRPC…</option>
                {SOURCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              {errors.sourceType && <p className="mt-1 text-xs text-red-500">{errors.sourceType}</p>}
            </div>
          </div>
          <div className="grid grid-cols-[116px_1fr] items-start gap-3">
            <label className={labelCls}>Data Latency: <span className="text-red-400">*</span></label>
            <div className="relative">
              <select value={form.dataLatency} onChange={(e) => set("dataLatency", e.target.value)} className={`${selectBase} ${inputActive} ${errors.dataLatency ? "border-red-300" : ""}`}>
                <option value="">Please select</option>
                {DATA_LATENCY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              {errors.dataLatency && <p className="mt-1 text-xs text-red-500">{errors.dataLatency}</p>}
            </div>
          </div>
          <div className="grid grid-cols-[116px_1fr] items-start gap-3">
            <label className={labelCls}>Description:</label>
            <textarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="长文本框" className={`${inputBase} ${inputActive} resize-none`} />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/40 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all">Cancel</button>
          <button onClick={handleSubmit} className="px-5 py-2 text-sm rounded-lg bg-gradient-to-r from-teal-500 to-cyan-500 text-white hover:from-teal-600 hover:to-cyan-600 shadow-sm shadow-teal-200 transition-all">
            {isEdit ? "Save" : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Region Form Modal (Add / Edit / Copy) ───────────────────────────────────

function RegionFormModal({ open, mode, parentRow, subRow, onClose, onSubmit }: {
  open: boolean; mode: RegionFormMode; parentRow: FeatureRow; subRow?: SubRow;
  onClose: () => void; onSubmit: (data: RegionFormData, mode: RegionFormMode) => void;
}) {
  const isEdit = mode === "edit";
  const isCopy = mode === "copy";

  const buildInitial = (): RegionFormData => {
    if (isEdit && subRow) return {
      region: subRow.region, version: subRow.version,
      inputParams: subRow.inputParams.length > 0 ? subRow.inputParams : [{ name: "", dataType: "string" }],
      callFunction: subRow.callFunction,
      outputParams: subRow.outputParams.length > 0 ? subRow.outputParams : [{ name: "", dataType: "string" }],
    };
    if (isCopy && subRow) return {
      region: "", version: "",
      inputParams: subRow.inputParams.length > 0 ? subRow.inputParams : [{ name: "", dataType: "string" }],
      callFunction: subRow.callFunction,
      outputParams: subRow.outputParams.length > 0 ? subRow.outputParams : [{ name: "", dataType: "string" }],
    };
    const cfTemplate = parentRow.sourceType && CF_TEMPLATE[parentRow.sourceType]
      ? JSON.stringify(CF_TEMPLATE[parentRow.sourceType], null, 2) : "";
    return { region: "", version: "", inputParams: [{ name: "", dataType: "string" }], callFunction: cfTemplate, outputParams: [{ name: "", dataType: "string" }] };
  };

  const [form, setForm] = useState<RegionFormData>(buildInitial);
  const [errors, setErrors] = useState<Partial<Record<keyof RegionFormData, string>>>({});

  useEffect(() => { if (open) { setForm(buildInitial()); setErrors({}); } }, [open, mode, subRow?.id, parentRow.id]);
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
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
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => { if (validate()) { onSubmit(form, mode); onClose(); } };

  const inputDisabled = "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed";
  const inputActive   = "bg-white border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 text-slate-800";
  const selectBase    = "w-full appearance-none px-3 py-2 text-sm border rounded-lg outline-none transition-all";
  const labelCls      = "text-sm text-slate-600 text-right whitespace-nowrap pt-2";

  const titleMap: Record<RegionFormMode, string> = { add: "Add Region Config", edit: "Edit Region Config", copy: "Copy Region Config" };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-xl mx-4 overflow-hidden max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-white to-teal-50/30 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center shadow-sm shadow-teal-200">
              {isEdit ? <FileEdit className="w-4 h-4 text-white" /> : isCopy ? <Copy className="w-4 h-4 text-white" /> : <Plus className="w-4 h-4 text-white" />}
            </div>
            <h2 className="text-slate-800">{titleMap[mode]}</h2>
            {isCopy && subRow && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-sky-50 text-sky-600 border border-sky-200">Copy from {subRow.region} {subRow.version}</span>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"><X className="w-4 h-4" /></button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">
          {/* Feature Source — readonly */}
          <div className="grid grid-cols-[116px_1fr] items-start gap-3">
            <label className={labelCls}>Feature Source:</label>
            <input type="text" disabled value={parentRow.featureSource}
              className={`w-full px-3 py-2 text-sm border rounded-lg outline-none ${inputDisabled}`} />
          </div>

          {/* Region + Version — same row */}
          <div className="grid grid-cols-[116px_1fr] items-start gap-3">
            <label className={labelCls}>Region: <span className="text-red-400">*</span></label>
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                {/* Region dropdown */}
                <div className="relative flex-1">
                  <select
                    disabled={isEdit}
                    value={form.region}
                    onChange={(e) => { setErrors(err => ({ ...err, region: undefined })); setForm(f => ({ ...f, region: e.target.value })); }}
                    className={`${selectBase} ${isEdit ? inputDisabled : inputActive} ${errors.region ? "border-red-300" : ""}`}
                  >
                    <option value="">Please select</option>
                    {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
                {/* Version badge */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-slate-400 whitespace-nowrap">Version:</span>
                  <span className="px-3 py-2 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-600 font-mono whitespace-nowrap min-w-[44px] text-center">
                    {form.version || "—"}
                  </span>
                </div>
              </div>
              {errors.region && <p className="text-xs text-red-500">{errors.region}</p>}
            </div>
          </div>

          {/* Call Function */}
          <div className="grid grid-cols-[116px_1fr] items-start gap-3">
            <label className={labelCls}>Call Function:</label>
            <JsonCodeEditor value={form.callFunction} onChange={(v) => setForm(f => ({ ...f, callFunction: v }))} placeholder={'{\n  "table_name": "",\n  "qualifier": "cf:score"\n}'} />
          </div>

          {/* Input Params */}
          <div className="grid grid-cols-[116px_1fr] items-start gap-3">
            <label className={labelCls}>Input Params:</label>
            <ParamRowEditor params={form.inputParams} onChange={(v) => setForm(f => ({ ...f, inputParams: v }))} />
          </div>

          {/* Output Params */}
          <div className="grid grid-cols-[116px_1fr] items-start gap-3">
            <label className={labelCls}>Output Params:</label>
            <ParamRowEditor params={form.outputParams} onChange={(v) => setForm(f => ({ ...f, outputParams: v }))} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/40 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all">Cancel</button>
          <button onClick={handleSubmit} className="px-5 py-2 text-sm rounded-lg bg-gradient-to-r from-teal-500 to-cyan-500 text-white hover:from-teal-600 hover:to-cyan-600 shadow-sm shadow-teal-200 transition-all">
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
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;

  const { ok, parsed } = tryParseJson(subRow.callFunction);
  const pillLabel = SOURCE_TYPE_CALL_LABEL[parentRow.sourceType] ?? parentRow.sourceType;
  const labelCls = "text-sm text-slate-600 text-right whitespace-nowrap pt-2";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-xl mx-4 overflow-hidden max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-white to-teal-50/30 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
              <Info className="w-4 h-4 text-slate-500" />
            </div>
            <h2 className="text-slate-800">View Region Config</h2>
            <StatusBadge status={subRow.status} />
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"><X className="w-4 h-4" /></button>
        </div>

        {/* Body — mirrors RegionFormModal layout, all read-only */}
        <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">
          {/* Feature Source */}
          <div className="grid grid-cols-[116px_1fr] items-start gap-3">
            <p className={labelCls}>Feature Source:</p>
            <input type="text" disabled value={parentRow.featureSource}
              className="w-full px-3 py-2 text-sm border rounded-lg outline-none bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed" />
          </div>

          {/* Region + Version — same row */}
          <div className="grid grid-cols-[116px_1fr] items-start gap-3">
            <p className={labelCls}>Region:</p>
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <input type="text" disabled value={subRow.region}
                  className="w-full px-3 py-2 text-sm border rounded-lg outline-none bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed" />
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-slate-400 whitespace-nowrap">Version:</span>
                <span className="px-3 py-2 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-600 font-mono whitespace-nowrap min-w-[44px] text-center">
                  {subRow.version}
                </span>
              </div>
            </div>
          </div>

          {/* Call Function */}
          <div className="grid grid-cols-[116px_1fr] items-start gap-3">
            <p className={labelCls}>Call Function:</p>
            <div className="rounded-xl overflow-hidden border border-slate-200">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border-b border-slate-100">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                <span className="ml-2 text-[11px] font-mono text-slate-400">call-function.json</span>
                <span className={`ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded border ${ok ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-red-50 text-red-500 border-red-200"}`}>
                  {ok ? "✓ valid JSON" : "✗ invalid JSON"}
                </span>
              </div>
              <pre className="px-4 py-3 text-xs font-mono text-slate-700 leading-relaxed bg-white whitespace-pre overflow-x-auto max-h-40">
                {ok ? JSON.stringify(parsed, null, 2) : subRow.callFunction || "—"}
              </pre>
            </div>
          </div>

          {/* Input Params */}
          <div className="grid grid-cols-[116px_1fr] items-start gap-3">
            <p className={labelCls}>Input Params:</p>
            <ParamRowEditor params={subRow.inputParams.length > 0 ? subRow.inputParams : []} disabled />
          </div>

          {/* Output Params */}
          <div className="grid grid-cols-[116px_1fr] items-start gap-3">
            <p className={labelCls}>Output Params:</p>
            <ParamRowEditor params={subRow.outputParams.length > 0 ? subRow.outputParams : []} disabled />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/40 flex-shrink-0">
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
  const [open, setOpen] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [dropPos, setDropPos] = useState<{ top: number; right: number } | null>(null);

  const canEnable  = subRow.status === "DRAFT";
  const canDisable = subRow.status === "ENABLE";
  const canDraft   = subRow.status === "DISABLE";

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setDropPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
    setOpen((v) => !v);
    setShowDisableConfirm(false);
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
      <button ref={btnRef} onClick={handleToggle} className="inline-flex items-center gap-1 text-xs text-teal-600 hover:text-teal-800 transition-colors">
        <Settings className="w-3 h-3" />Manage
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && dropPos && (
        <div style={{ position: "fixed", top: dropPos.top, right: dropPos.right, zIndex: 9999 }} className="bg-white border border-slate-200 rounded-xl shadow-xl shadow-slate-200/70 overflow-hidden min-w-[180px]" onMouseDown={(e) => e.stopPropagation()}>
          {!showDisableConfirm ? (
            <div>
              <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">Manage</span>
                <span className="ml-auto"><StatusBadge status={subRow.status} /></span>
              </div>
              <button disabled={!canEnable} onClick={() => { onEnable(); setOpen(false); }} className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs transition-colors ${canEnable ? "text-emerald-600 hover:bg-emerald-50 cursor-pointer" : "text-slate-300 cursor-not-allowed"}`}>
                <CheckCircle2 className="w-3.5 h-3.5" />Enable{!canEnable && <span className="ml-auto text-[10px] text-slate-300">Only DRAFT</span>}
              </button>
              <button disabled={!canDisable} onClick={() => canDisable && setShowDisableConfirm(true)} className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs transition-colors ${canDisable ? "text-orange-500 hover:bg-orange-50 cursor-pointer" : "text-slate-300 cursor-not-allowed"}`}>
                <XCircle className="w-3.5 h-3.5" />Disable{!canDisable && <span className="ml-auto text-[10px] text-slate-300">Only ENABLE</span>}
              </button>
              <button disabled={!canDraft} onClick={() => { onDraft(); setOpen(false); }} className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs transition-colors ${canDraft ? "text-slate-600 hover:bg-slate-50 cursor-pointer" : "text-slate-300 cursor-not-allowed"}`}>
                <ToggleLeft className="w-3.5 h-3.5" />Draft{!canDraft && <span className="ml-auto text-[10px] text-slate-300">Only DISABLE</span>}
              </button>
            </div>
          ) : (
            <div className="p-3 space-y-2.5">
              <div className="flex items-center gap-1.5 text-orange-600"><AlertTriangle className="w-3.5 h-3.5" /><span className="text-xs">Confirm Disable</span></div>
              <p className="text-[11px] text-slate-500 leading-relaxed">Referenced by <strong className="text-slate-700">{linkedGroups.length}</strong> downstream Feature Group{linkedGroups.length > 1 ? "s" : ""}:</p>
              <div className="rounded-lg bg-orange-50 border border-orange-200 px-2.5 py-2 space-y-1">
                {linkedGroups.map((g) => (
                  <div key={g} className="flex items-center gap-1.5 text-[11px]"><span className="w-1 h-1 rounded-full bg-orange-400 flex-shrink-0" /><code className="text-orange-700 font-mono">{g}</code></div>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => setShowDisableConfirm(false)} className="px-3 py-1.5 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all">Cancel</button>
                <button onClick={() => { onDisable(); setOpen(false); setShowDisableConfirm(false); }} className="px-3 py-1.5 text-xs text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-all">Disable</button>
              </div>
            </div>
          )}
        </div>
      )}
    </span>
  );
}

// ─── Nested Sub-Table ─────────────────────────────────────────────────────────

function SubTable({ rows, sourceType, onStatusChange, onEdit, onView, onCopy }: {
  rows: SubRow[]; sourceType: string;
  onStatusChange: (subRowId: string, newStatus: SubStatus) => void;
  onEdit: (subRow: SubRow) => void;
  onView: (subRow: SubRow) => void;
  onCopy: (subRow: SubRow) => void;
}) {
  return (
    <div className="mx-4 mb-3 rounded-xl border border-slate-200 shadow-sm overflow-visible">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gradient-to-r from-slate-50 to-slate-100">
            {["Region", "Call Function", "Input Params", "Output Params", "Status", "UpdateTime", "Action"].map((h, i, arr) => (
              <th key={h} className={`px-4 py-2.5 text-left text-xs text-slate-500 whitespace-nowrap border-b border-slate-200 bg-slate-50 ${i === 0 ? "rounded-tl-xl" : i === arr.length - 1 ? "rounded-tr-xl" : ""}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id} className={`transition-colors duration-150 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/60"} hover:bg-teal-50/40`}>
              {/* Region + Version */}
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-600">{row.region}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-teal-50 text-teal-600 border border-teal-200">{row.version}</span>
                </div>
              </td>
              <td className="px-4 py-3"><CallFunctionDisplay value={row.callFunction} sourceType={sourceType} /></td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {row.inputParams.map((p) => <ParamTag key={p.name} label={p.name} />)}
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {row.outputParams.map((p) => <ParamTag key={p.name} label={p.name} />)}
                </div>
              </td>
              <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
              <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{row.updateTime}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <button onClick={() => onEdit(row)} className="text-xs text-teal-600 hover:text-teal-800 hover:underline transition-colors">Edit</button>
                  <button onClick={() => onView(row)} className="text-xs text-teal-600 hover:text-teal-800 hover:underline transition-colors">View</button>
                  <button onClick={() => onCopy(row)} className="text-xs text-teal-600 hover:text-teal-800 hover:underline transition-colors">Copy</button>
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
  );
}

// ─── Test Modal ───────────────────────────────────────────────────────────────

function TestModal({ open, row, onClose }: { open: boolean; row: FeatureRow | null; onClose: () => void }) {
  const [tab, setTab] = useState<"new" | "history">("new");
  const [testRegion, setTestRegion]   = useState("");
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [outputValues, setOutputValues] = useState<Record<string, string>>({});
  const [duration, setDuration]       = useState<number | null>(null);
  const [isTesting, setIsTesting]     = useState(false);
  const [showJsonEditor, setShowJsonEditor] = useState(false);
  const [jsonPaste, setJsonPaste]     = useState("");
  const [hRegion, setHRegion]         = useState("");
  const [hOperator, setHOperator]     = useState("");
  const [hStatus, setHStatus]         = useState<"" | "Success" | "Failed">("");
  const [applied, setApplied]         = useState({ region: "", operator: "", status: "" as "" | "Success" | "Failed" });
  const [detailRecord, setDetailRecord] = useState<TestHistoryRecord | null>(null);
  const [copiedInput, setCopiedInput] = useState(false);
  const [copiedOutput, setCopiedOutput] = useState(false);

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
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
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
      outputParams.forEach(p => {
        out[p.name] = (p.dataType === "int" || p.dataType === "long") ? String(Math.floor(Math.random() * 100)) : `mock_${p.name}`;
      });
      setOutputValues(out); setDuration(ms); setIsTesting(false);
    }, ms);
  };

  const rawHistory = MOCK_TEST_HISTORY[row.id] ?? [];
  const displayHistory = rawHistory.filter(r => {
    if (applied.region   && r.region   !== applied.region)          return false;
    if (applied.operator && !r.operator.includes(applied.operator)) return false;
    if (applied.status   && r.status   !== applied.status)          return false;
    return true;
  });

  const handleQuery     = () => setApplied({ region: hRegion, operator: hOperator, status: hStatus });
  const handleHistReset = () => { setHRegion(""); setHOperator(""); setHStatus(""); setApplied({ region: "", operator: "", status: "" }); };

  const handleLoadRecord = (rec: TestHistoryRecord) => {
    setTestRegion(rec.region); setInputValues(rec.input); setOutputValues({}); setDuration(null); setTab("new");
  };

  const inBase  = "w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all bg-white text-slate-700 placeholder:text-slate-300";
  const selBase = "w-full appearance-none px-3 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all bg-white text-slate-700";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-4xl mx-4 max-h-[88vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0 bg-gradient-to-r from-white to-teal-50/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center shadow-sm shadow-teal-200"><FlaskConical className="w-4 h-4 text-white" /></div>
            <h2 className="text-slate-800">{row.featureSource} Test</h2>
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
                    <Code2 className="w-3.5 h-3.5" />Set Input Params By JSON
                  </button>
                </div>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-5 pt-3 pb-2">
                    <p className="text-xs text-slate-500 mb-2">Input Params:</p>
                    {inputParams.length > 0 ? (
                      <table className="w-full">
                        <thead><tr>{["Name", "Type", "Value"].map(h => <th key={h} className="text-left text-xs text-slate-600 pb-2 pr-4 font-medium">{h}</th>)}</tr></thead>
                        <tbody className="divide-y divide-slate-100">
                          {inputParams.map(p => (
                            <tr key={p.name}>
                              <td className="py-2.5 pr-4 text-xs text-slate-700 whitespace-nowrap w-44">{p.name}</td>
                              <td className="py-2.5 pr-4 text-xs text-emerald-600 w-20">{p.dataType}</td>
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
                        <thead><tr>{["Name", "Type", "Value"].map(h => <th key={h} className="text-left text-xs text-slate-600 pb-2 pr-4 font-medium">{h}</th>)}</tr></thead>
                        <tbody className="divide-y divide-slate-100">
                          {outputParams.map(p => (
                            <tr key={p.name}>
                              <td className="py-2.5 pr-4 text-xs text-slate-700 whitespace-nowrap w-44">{p.name}</td>
                              <td className="py-2.5 pr-4 text-xs text-emerald-600 w-20">{p.dataType}</td>
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
                <button onClick={handleTest} disabled={!testRegion || isTesting} className="flex items-center gap-2 px-6 py-2 text-sm text-white bg-gradient-to-r from-teal-500 to-cyan-500 rounded-lg hover:from-teal-600 hover:to-cyan-600 shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed">
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
                  <button onClick={handleQuery} className="flex items-center gap-1.5 px-4 py-1.5 text-xs text-white bg-gradient-to-r from-teal-500 to-cyan-500 rounded-lg hover:from-teal-600 hover:to-cyan-600 transition-all"><Search className="w-3 h-3" />Query</button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-50 z-10">
                    <tr>{["Region", "CreateTime", "Operator", "Status", "Action"].map(h => <th key={h} className="px-5 py-3 text-left text-xs text-slate-500 whitespace-nowrap border-b border-slate-200">{h}</th>)}</tr>
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
                            <button onClick={() => setDetailRecord(rec)} className="text-xs text-teal-600 hover:text-teal-800 hover:underline transition-colors">Detail</button>
                            <button onClick={() => handleLoadRecord(rec)} className="text-xs text-slate-500 hover:text-slate-700 hover:underline transition-colors">Load</button>
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
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/25 rounded-2xl" onClick={() => setShowJsonEditor(false)}>
            <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-96 p-5 space-y-3" onClick={e => e.stopPropagation()}>
              <h3 className="text-sm text-slate-800">Set Input Params By JSON</h3>
              <p className="text-xs text-slate-400">Paste a JSON object — matching param keys will be auto-filled.</p>
              <textarea rows={8} value={jsonPaste} onChange={e => setJsonPaste(e.target.value)} placeholder={'{\n  "user_id": "U123456"\n}'} className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 resize-none" spellCheck={false} />
              <div className="flex justify-end gap-2">
                <button onClick={() => { setShowJsonEditor(false); setJsonPaste(""); }} className="px-3 py-1.5 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all">Cancel</button>
                <button onClick={handleApplyJson} className="px-4 py-1.5 text-xs text-white bg-gradient-to-r from-teal-500 to-cyan-500 rounded-lg hover:from-teal-600 hover:to-cyan-600 transition-all">Apply</button>
              </div>
            </div>
          </div>
        )}

        {/* Detail panel */}
        {detailRecord && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/25 rounded-2xl" onClick={() => setDetailRecord(null)}>
            <div className="bg-white rounded-xl shadow-xl border border-slate-100 w-[500px] max-h-[76vh] flex flex-col overflow-hidden mx-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <h3 className="text-slate-800">Test Details</h3>
                <button onClick={() => setDetailRecord(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"><X className="w-4 h-4" /></button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-teal-600">Input:</span>
                    <button onClick={() => { navigator.clipboard.writeText(JSON.stringify(detailRecord.input, null, 2)); setCopiedInput(true); setTimeout(() => setCopiedInput(false), 2000); }} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors">
                      <Copy className="w-3.5 h-3.5" />{copiedInput ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <pre className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs font-mono text-slate-700 whitespace-pre overflow-x-auto max-h-56">{JSON.stringify(detailRecord.input, null, 2)}</pre>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-emerald-600">Output:</span>
                    <button onClick={() => { navigator.clipboard.writeText(JSON.stringify(detailRecord.output, null, 2)); setCopiedOutput(true); setTimeout(() => setCopiedOutput(false), 2000); }} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors">
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
  const [tableData, setTableData]       = useState<FeatureRow[]>(INITIAL_DATA);
  const [featureSource, setFeatureSource] = useState("");
  const [sourceType, setSourceType]     = useState("");
  const [region, setRegion]             = useState("");
  const [creator, setCreator]           = useState("");
  const [filterExpanded, setFilterExpanded] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage]   = useState(1);
  const [pageSize, setPageSize]         = useState(20);
  const [appliedFilters, setAppliedFilters] = useState({
    featureSource: "",
    sourceType: "",
    region: "",
    creator: "",
  });
  const [modal, setModal]               = useState<ModalState>({ open: false, type: "warning", title: "", body: null });
  const [metaFormModal, setMetaFormModal] = useState<{ open: boolean; mode: "add" | "editMeta"; row?: FeatureRow }>({ open: false, mode: "add" });
  const [regionFormModal, setRegionFormModal] = useState<{ open: boolean; mode: RegionFormMode; parentRow?: FeatureRow; subRow?: SubRow }>({ open: false, mode: "add" });
  const [viewModal, setViewModal]       = useState<{ open: boolean; parentRow?: FeatureRow; subRow?: SubRow }>({ open: false });
  const [testModal, setTestModal]       = useState<{ open: boolean; row: FeatureRow | null }>({ open: false, row: null });

  const closeModal      = () => setModal(m => ({ ...m, open: false }));
  const closeMetaForm   = () => setMetaFormModal({ open: false, mode: "add" });
  const closeRegionForm = () => setRegionFormModal({ open: false, mode: "add" });
  const closeViewModal  = () => setViewModal({ open: false });

  const toggleRow = (id: string) => setExpandedRows(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const handleReset = () => {
    setFeatureSource("");
    setSourceType("");
    setRegion("");
    setCreator("");
    setAppliedFilters({ featureSource: "", sourceType: "", region: "", creator: "" });
    setCurrentPage(1);
  };

  const handleSearch = () => {
    setAppliedFilters({
      featureSource: featureSource.trim(),
      sourceType,
      region,
      creator: creator.trim(),
    });
    setCurrentPage(1);
  };

  const filteredRows = useMemo(() => {
    return tableData.filter((row) => {
      const fs = appliedFilters.featureSource;
      if (fs && !row.featureSource.toLowerCase().includes(fs.toLowerCase())) return false;
      if (appliedFilters.sourceType && row.sourceType !== appliedFilters.sourceType) return false;
      if (appliedFilters.region) {
        const r = appliedFilters.region;
        const inRegions = row.regions.includes(r);
        const inSubs = row.subRows.some((s) => s.region === r);
        if (!inRegions && !inSubs) return false;
      }
      const cr = appliedFilters.creator;
      if (cr && !row.creator.toLowerCase().includes(cr.toLowerCase())) return false;
      return true;
    });
  }, [tableData, appliedFilters]);

  const total = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pagedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const handleOpenAdd       = () => setMetaFormModal({ open: true, mode: "add" });
  const handleOpenEditMeta  = (row: FeatureRow) => setMetaFormModal({ open: true, mode: "editMeta", row });
  const handleRowAdd        = (row: FeatureRow) => setRegionFormModal({ open: true, mode: "add", parentRow: row });
  const handleSubEdit       = (parentRow: FeatureRow, subRow: SubRow) => setRegionFormModal({ open: true, mode: "edit", parentRow, subRow });
  const handleSubView       = (parentRow: FeatureRow, subRow: SubRow) => setViewModal({ open: true, parentRow, subRow });
  const handleSubCopy       = (parentRow: FeatureRow, subRow: SubRow) => setRegionFormModal({ open: true, mode: "copy", parentRow, subRow });

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
          subRows: [...row.subRows, {
            id: newSubId, region: data.region, version: data.version,
            callFunction: data.callFunction, inputParams: data.inputParams,
            outputParams: data.outputParams, status: "DRAFT", updateTime: nowString(),
          }],
        };
      }));
    } else if (mode === "edit" && editingSubRow) {
      setTableData(prev => prev.map(row => {
        if (row.id !== parentRow.id) return row;
        return {
          ...row,
          subRows: row.subRows.map(sub => sub.id !== editingSubRow.id ? sub : {
            ...sub, callFunction: data.callFunction, inputParams: data.inputParams,
            outputParams: data.outputParams, updateTime: nowString(),
          }),
        };
      }));
    } else if (mode === "copy") {
      const newSubId = `${parentRow.id}-${Date.now()}`;
      setTableData(prev => prev.map(row => {
        if (row.id !== parentRow.id) return row;
        return {
          ...row,
          regions: row.regions.includes(data.region) ? row.regions : [...row.regions, data.region],
          subRows: [...row.subRows, {
            id: newSubId, region: data.region, version: data.version,
            callFunction: data.callFunction, inputParams: data.inputParams,
            outputParams: data.outputParams, status: "DRAFT", updateTime: nowString(),
          }],
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
              <p className="text-xs text-amber-700 font-medium mb-2">Regions to remove first:</p>
              {row.subRows.map((s) => (
                <div key={s.id} className="flex items-center justify-between text-xs">
                  <span className="text-slate-700 font-medium">{s.region} <span className="text-slate-400 font-mono">{s.version}</span></span>
                  <StatusBadge status={s.status} />
                </div>
              ))}
            </div>
          </div>
        ),
      });
      return;
    }
    setTableData((prev) => prev.filter((r) => r.id !== row.id));
  };

  const handleSubDelete = (subRow: SubRow) => {
    const linkedGroups = DOWNSTREAM_FEATURE_GROUPS[subRow.id] ?? ["unknown_feature_group"];
    setModal({
      open: true, type: "error", title: "Cannot Delete Region Config",
      body: (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Region <strong>{subRow.region}</strong> is referenced by <strong>{linkedGroups.length}</strong> downstream Feature Group{linkedGroups.length > 1 ? "s" : ""}:</p>
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 space-y-1.5">
            {linkedGroups.map((g) => (
              <div key={g} className="flex items-center gap-2 text-xs"><span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" /><code className="text-red-700 font-mono">{g}</code></div>
            ))}
          </div>
          <p className="text-xs text-slate-400">Remove or migrate the above Feature Groups before deleting.</p>
        </div>
      ),
    });
  };

  const activeFilterCount = [
    appliedFilters.featureSource,
    appliedFilters.sourceType,
    appliedFilters.region,
    appliedFilters.creator,
  ].filter(Boolean).length;

  return (
    <div className="min-h-full bg-[#f5f7fa]">
      <Modal state={modal} onClose={closeModal} />
      <MetaFormModal open={metaFormModal.open} mode={metaFormModal.mode} row={metaFormModal.row} onClose={closeMetaForm} onSubmit={handleMetaSubmit} />
      {regionFormModal.parentRow && (
        <RegionFormModal open={regionFormModal.open} mode={regionFormModal.mode} parentRow={regionFormModal.parentRow} subRow={regionFormModal.subRow} onClose={closeRegionForm} onSubmit={handleRegionSubmit} />
      )}
      {viewModal.open && viewModal.parentRow && viewModal.subRow && (
        <ViewRegionModal open={viewModal.open} parentRow={viewModal.parentRow} subRow={viewModal.subRow} onClose={closeViewModal} />
      )}
      <TestModal open={testModal.open} row={testModal.row} onClose={() => setTestModal({ open: false, row: null })} />

      <header className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-3 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#13c2c2] flex items-center justify-center shadow-sm">
            <Layers size={14} className="text-white" />
          </div>
          <div>
            <h1
              className="text-gray-800 leading-tight"
              style={{ fontSize: "15px", fontWeight: 600 }}
            >
              Feature Source
            </h1>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs text-gray-400">
          <RefreshCw size={11} />
          <span>FeatureStore prototype</span>
        </div>
      </header>

      <main className="p-5 flex flex-col gap-4 max-w-screen-2xl mx-auto">
        {/* Filter Bar — card shell aligned with WideTable FilterBar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div
            className="flex items-center justify-between px-6 py-4 border-b border-gray-50 cursor-pointer select-none hover:bg-black/[0.02] transition-colors"
            onClick={() => setFilterExpanded((v) => !v)}
          >
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-teal-500 rounded-full" />
              <span className="text-sm text-gray-500 tracking-wide uppercase">
                Filters
              </span>
              {activeFilterCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-xs bg-emerald-500 text-white font-medium">
                  {activeFilterCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 min-w-0">
              {!filterExpanded && (
                <div className="flex items-center gap-2 flex-wrap justify-end min-w-0">
                  {appliedFilters.featureSource && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs bg-teal-50 text-teal-700 border border-teal-200">
                      Source: <strong className="truncate max-w-[120px]">{appliedFilters.featureSource}</strong>
                    </span>
                  )}
                  {appliedFilters.sourceType && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs bg-teal-50 text-teal-700 border border-teal-200">
                      Type: <strong>{appliedFilters.sourceType}</strong>
                    </span>
                  )}
                  {appliedFilters.region && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs bg-teal-50 text-teal-700 border border-teal-200">
                      Region: <strong>{appliedFilters.region}</strong>
                    </span>
                  )}
                  {appliedFilters.creator && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs bg-teal-50 text-teal-700 border border-teal-200">
                      Creator: <strong className="truncate max-w-[140px]">{appliedFilters.creator}</strong>
                    </span>
                  )}
                  {activeFilterCount === 0 && (
                    <span className="text-xs text-gray-400">No filters applied</span>
                  )}
                </div>
              )}
              <span className="flex items-center gap-1.5 text-teal-600 text-sm shrink-0">
                <span>{filterExpanded ? "Collapse" : "Expand"}</span>
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-200 ${filterExpanded ? "rotate-180" : ""}`}
                />
              </span>
            </div>
          </div>
          {filterExpanded && (
            <div className="px-5 pb-5 pt-1 border-t border-slate-100">
              <div className="grid grid-cols-3 gap-x-6 gap-y-4 mt-4">
                <div className="flex items-center gap-3">
                  <label className="text-sm text-slate-500 whitespace-nowrap min-w-[96px] text-right">Feature Source:</label>
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" placeholder="Fuzzy search" value={featureSource} onChange={(e) => setFeatureSource(e.target.value)} className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all placeholder:text-slate-400" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-sm text-slate-500 whitespace-nowrap min-w-[80px] text-right">Source Type:</label>
                  <div className="relative flex-1">
                    <select value={sourceType} onChange={(e) => setSourceType(e.target.value)} className="w-full appearance-none px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all text-slate-600">
                      <option value="">Please select</option>
                      {SOURCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-sm text-slate-500 whitespace-nowrap min-w-[52px] text-right">Region:</label>
                  <div className="relative flex-1">
                    <select value={region} onChange={(e) => setRegion(e.target.value)} className="w-full appearance-none px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all text-slate-600">
                      <option value="">Please select</option>
                      {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-sm text-slate-500 whitespace-nowrap min-w-[96px] text-right">Creator:</label>
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" placeholder="Fuzzy search" value={creator} onChange={(e) => setCreator(e.target.value)} className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all placeholder:text-slate-400" />
                  </div>
                </div>
                <div className="col-start-3 flex items-center justify-end gap-3">
                  <button type="button" onClick={handleReset} className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all"><RotateCcw size={13} />Reset</button>
                  <button type="button" onClick={handleSearch} className="flex items-center gap-1.5 px-5 py-2 text-sm text-white bg-teal-500 rounded-lg hover:bg-teal-600 transition-all shadow-sm shadow-teal-200"><Search size={13} />Search</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span className="w-2 h-2 rounded-full bg-teal-400" />
              <span>Total <strong className="text-slate-700">{total}</strong> records</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleOpenAdd} className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-gradient-to-r from-teal-500 to-cyan-500 rounded-lg hover:from-teal-600 hover:to-cyan-600 shadow-sm transition-all">
                <Plus className="w-4 h-4" />Add Feature Source
              </button>
              <button className="p-2 text-slate-400 hover:text-teal-500 hover:bg-teal-50 rounded-lg transition-all border border-slate-200"><RefreshCw className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-slate-50 to-slate-100/80">
                  <th className="w-10 px-4 py-3 border-b border-slate-200" />
                  {["Feature Source", "Source Type", "Data Latency", "Region", "Creator", "CreateTime", "Description", "Action"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs text-slate-500 whitespace-nowrap border-b border-slate-200">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedRows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-sm text-slate-400">
                      No records match the current filters.
                    </td>
                  </tr>
                )}
                {pagedRows.map((row, idx) => {
                  const isExpanded = expandedRows.has(row.id);
                  const hasChildren = row.subRows.length > 0;
                  return (
                    <Fragment key={row.id}>
                      <tr
                        className={`group transition-colors duration-150 ${isExpanded ? "bg-teal-50/30" : idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"} hover:bg-teal-50/40 cursor-pointer`}
                        onClick={() => hasChildren && toggleRow(row.id)}
                      >
                        <td className="px-4 py-4 text-center">
                          {hasChildren ? (
                            <button className={`inline-flex items-center justify-center w-6 h-6 rounded-md border transition-all ${isExpanded ? "bg-teal-500 border-teal-500 text-white" : "bg-white border-slate-300 text-slate-500 hover:border-teal-400 hover:text-teal-500"}`} onClick={(e) => { e.stopPropagation(); toggleRow(row.id); }}>
                              {isExpanded ? <Minus className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                            </button>
                          ) : (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-md border border-slate-200 text-slate-300"><Plus className="w-3 h-3" /></span>
                          )}
                        </td>
                        <td className="px-4 py-4"><span className="text-slate-800 font-mono text-xs">{row.featureSource}</span></td>
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                            <span className="text-teal-500">{sourceTypeIconMap[row.sourceType] ?? <Database className="w-3.5 h-3.5" />}</span>
                            {row.sourceType}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-xs text-slate-600 whitespace-nowrap">{row.dataLatency}</td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-1">
                            {row.regions.map(r => {
                              const sub = row.subRows.find(s => s.region === r);
                              return <RegionTag key={r} region={r} status={sub?.status} />;
                            })}
                          </div>
                        </td>
                        <td className="px-4 py-4"><span className="text-xs text-slate-600 truncate max-w-[160px] block">{row.creator}</span></td>
                        <td className="px-4 py-4 text-xs text-slate-500 whitespace-nowrap">{row.createTime}</td>
                        <td className="px-4 py-4 text-xs text-slate-500 max-w-[200px]"><span className="truncate block" title={row.description}>{row.description}</span></td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <button className="text-xs text-teal-600 hover:text-teal-800 hover:underline transition-colors" onClick={(e) => { e.stopPropagation(); handleRowAdd(row); }}>Add</button>
                            <button className="text-xs text-teal-600 hover:text-teal-800 hover:underline transition-colors" onClick={(e) => { e.stopPropagation(); handleOpenEditMeta(row); }}>Edit</button>
                            <button className="text-xs text-teal-600 hover:text-teal-800 hover:underline transition-colors" onClick={(e) => { e.stopPropagation(); setTestModal({ open: true, row }); }}>Test</button>
                            <button className="text-xs text-red-400 hover:text-red-600 hover:underline transition-colors" onClick={(e) => { e.stopPropagation(); handlePrimaryDelete(row); }}>Delete</button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && row.subRows.length > 0 && (
                        <tr>
                          <td colSpan={9} className="bg-slate-50/60 py-2">
                            <SubTable
                              rows={row.subRows}
                              sourceType={row.sourceType}
                              onStatusChange={(subRowId, newStatus) => handleStatusChange(row.id, subRowId, newStatus)}
                              onEdit={(subRow) => handleSubEdit(row, subRow)}
                              onView={(subRow) => handleSubView(row, subRow)}
                              onCopy={(subRow) => handleSubCopy(row, subRow)}
                            />
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
          <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 bg-slate-50/40">
            <span className="text-xs text-slate-400">
              {total === 0
                ? <>0 of <strong className="text-slate-600">0</strong> items</>
                : <>{(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, total)} of <strong className="text-slate-600">{total}</strong> items</>}
            </span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setCurrentPage(1)} disabled={currentPage === 1 || total === 0} className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-teal-600 hover:border-teal-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"><ChevronsLeft className="w-3.5 h-3.5" /></button>
              <button type="button" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1 || total === 0} className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-teal-600 hover:border-teal-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"><ChevronLeft className="w-3.5 h-3.5" /></button>
              <button type="button" className="w-8 h-8 rounded-lg text-xs border bg-teal-500 text-white border-teal-500 shadow-sm shadow-teal-200">{currentPage}</button>
              <button type="button" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages || total === 0} className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-teal-600 hover:border-teal-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"><ChevronRight className="w-3.5 h-3.5" /></button>
              <button type="button" onClick={() => setCurrentPage(totalPages)} disabled={currentPage >= totalPages || total === 0} className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-teal-600 hover:border-teal-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"><ChevronsRight className="w-3.5 h-3.5" /></button>
              <div className="relative ml-2">
                <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }} className="appearance-none pl-3 pr-7 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-600 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all">
                  {[10, 20, 50, 100].map(s => <option key={s} value={s}>{s} / page</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
