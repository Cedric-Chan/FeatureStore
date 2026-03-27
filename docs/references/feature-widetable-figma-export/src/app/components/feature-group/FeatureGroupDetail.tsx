import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import {
  ArrowLeft,
  MapPin,
  Layers,
  User,
  Clock,
  FileText,
  Edit2,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Circle,
  RefreshCw,
  Calendar,
  Ban,
  Trash2,
  AlertTriangle,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Info,
  RotateCcw,
  GitBranch,
  Activity,
  Database,
  Zap,
  Timer,
  Copy,
  Check,
} from "lucide-react";
import type { FeatureGroup, FeatureGroupStatus } from "./FeatureGroupList";
import { INITIAL_MODULES } from "./FeatureGroupList";
import FeatureGroupModal, { type FGFormData, normalizeFgFormData } from "./FeatureGroupModal";

// ─── Source type badge colors ─────────────────────────────────────────────────
const SOURCE_TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  HBase:   { bg: "#e6f4ff", text: "#0958d9", border: "#91caff" },
  Redis:   { bg: "#fff1f0", text: "#cf1322", border: "#ffa39e" },
  gRPC:    { bg: "#f9f0ff", text: "#531dab", border: "#d3adf7" },
  GraphDB: { bg: "#fff7e6", text: "#ad4e00", border: "#ffd591" },
};
function SourceTypeBadge({ sourceType }: { sourceType: string }) {
  const c = SOURCE_TYPE_COLORS[sourceType] ?? { bg: "#f3f4f6", text: "#374151", border: "#e5e7eb" };
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs border"
      style={{ background: c.bg, color: c.text, borderColor: c.border, fontWeight: 600 }}>
      {sourceType}
    </span>
  );
}

// ─── Mocked page data ─────────────────────────────────────────────────────────
const MOCK_DATA: FeatureGroup[] = [
  {
    id: "1",
    name: "user_risk_score_fg",
    status: "Online",
    region: "TH",
    module: "1",
    owner: "cedric.chencan@seamoney.com,sankar.shyamal@seamoney.com",
    createTime: "2026-02-14 10:00:00",
    updateTime: "2026-02-16 08:30:00",
    description:
      "User risk scoring feature group for Thailand market, aggregates behavioral signals and transaction patterns.",
  },
  {
    id: "2",
    name: "mx_acard_realtime_fg",
    status: "Online Changing",
    region: "MX",
    module: "53",
    entity: ["platform_user_id", "spp_user_id"],
    owner: "zhengyi.loh@seamoney.com",
    createTime: "2026-02-10 14:20:00",
    updateTime: "2026-02-15 11:00:00",
    description:
      "Real-time feature group for Mexico A-card model, capturing live transaction velocity and account age features.",
  },
  {
    id: "3",
    name: "th_embedding_fg_v3",
    status: "Online",
    region: "TH",
    module: "53",
    entity: ["platform_user_id", "item_id"],
    owner: "sankar.shyamal@seamoney.com,huangwei@shopee.com,xiaochen.kuang@monee.com",
    createTime: "2026-02-08 09:30:00",
    updateTime: "2026-02-11 16:20:00",
    description:
      "Version 3 of Thailand embedding feature group, includes improved user graph embeddings and NLP-derived features.",
  },
  {
    id: "4",
    name: "dp_recommend_score_fg",
    status: "Draft",
    region: "SHOPEE_SG",
    module: "1",
    entity: ["item_id", "shop_id"],
    owner: "huangwei@shopee.com",
    createTime: "2026-02-16 13:45:00",
    updateTime: "2026-02-16 13:45:00",
    description:
      "Draft feature group for Shopee Singapore recommendation scoring, currently under review and validation.",
  },
  {
    id: "5",
    name: "user_graph_relation_fg",
    status: "Online",
    region: "TH",
    module: "1",
    entity: ["platform_user_id", "shop_id"],
    owner: "cedric.chencan@seamoney.com,zhengyi.loh@seamoney.com",
    createTime: "2026-02-06 11:00:00",
    updateTime: "2026-02-13 09:00:00",
    description:
      "User social graph and relation feature group, derives network-based features for fraud detection models.",
  },
  {
    id: "6",
    name: "mx_device_fingerprint_fg",
    status: "Online Changing",
    region: "MX",
    module: "53",
    entity: ["spp_user_id", "platform_user_id"],
    owner: "xiaochen.kuang@monee.com",
    createTime: "2026-01-28 15:30:00",
    updateTime: "2026-02-15 20:00:00",
    description:
      "Device fingerprint feature group for Mexico, tracks device identity signals and cross-device behavior patterns.",
  },
];

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<
  FeatureGroupStatus,
  { label: string; bg: string; text: string; dot: string; border: string; icon: React.ReactNode }
> = {
  Online: {
    label: "Online",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
    border: "border-emerald-200",
    icon: <CheckCircle2 size={14} className="text-emerald-500" />,
  },
  "Online Changing": {
    label: "Online Changing",
    bg: "bg-amber-50",
    text: "text-amber-700",
    dot: "bg-amber-500",
    border: "border-amber-200",
    icon: <RefreshCw size={14} className="text-amber-500" />,
  },
  Draft: {
    label: "Draft",
    bg: "bg-slate-100",
    text: "text-slate-600",
    dot: "bg-slate-400",
    border: "border-slate-200",
    icon: <Circle size={14} className="text-slate-400" />,
  },
  Offline: {
    label: "Offline",
    bg: "bg-red-50",
    text: "text-red-600",
    dot: "bg-red-400",
    border: "border-red-200",
    icon: <AlertCircle size={14} className="text-red-400" />,
  },
  Disable: {
    label: "Disable",
    bg: "bg-gray-100",
    text: "text-gray-500",
    dot: "bg-gray-400",
    border: "border-gray-200",
    icon: <Ban size={14} className="text-gray-400" />,
  },
};

function StatusTag({ status }: { status: FeatureGroupStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm border ${cfg.bg} ${cfg.text} ${cfg.border}`}
      style={{ fontWeight: 500 }}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
      <div className="flex items-center gap-2 mb-1.5">
        <span style={{ color: "#13c2c2" }}>{icon}</span>
        <span className="text-xs text-gray-400" style={{ fontWeight: 500 }}>
          {label}
        </span>
      </div>
      <p className="text-gray-800 text-sm break-all" style={{ fontWeight: 600 }}>
        {value}
      </p>
    </div>
  );
}

// ─── Feature List mock data ───────────────────────────────────────────────────
interface FeatureRow {
  name: string;        // Training feature name (column in offline table)
  servingName?: string; // Serving alias (transformation output name) — omit if same as name
  dataType: string;
  partition: boolean;
  training: boolean;
  serving: boolean;
  dataLatency?: "Online" | "Nearline" | "Offline"; // only when serving=true
}

const DEFAULT_FEATURES: FeatureRow[] = [
  { name: "risk_score",           servingName: "user_risk_score",  dataType: "FLOAT",   partition: true,  training: true,  serving: true,  dataLatency: "Online"   },
  { name: "risk_level",                                            dataType: "STRING",  partition: false, training: true,  serving: true,  dataLatency: "Nearline" },
  { name: "overdue_days_30",                                       dataType: "INT",     partition: false, training: true,  serving: false },
  { name: "last_login_ts",                                         dataType: "LONG",    partition: false, training: true,  serving: true,  dataLatency: "Online"   },
  { name: "transaction_count_7d", servingName: "tx_count_7d",      dataType: "INT",     partition: false, training: true,  serving: true,  dataLatency: "Nearline" },
  { name: "avg_order_value",                                       dataType: "FLOAT",   partition: false, training: true,  serving: false },
  { name: "device_model_hash",                                     dataType: "STRING",  partition: false, training: false, serving: true,  dataLatency: "Offline"  },
  { name: "is_verified",                                           dataType: "BOOLEAN", partition: false, training: true,  serving: true,  dataLatency: "Online"   },
  { name: "kyc_level",                                             dataType: "INT",     partition: true,  training: true,  serving: true,  dataLatency: "Nearline" },
  { name: "credit_score_raw",     servingName: "credit_score",     dataType: "FLOAT",   partition: false, training: true,  serving: true,  dataLatency: "Online"   },
  { name: "account_age_days",                                      dataType: "INT",     partition: false, training: true,  serving: false },
  { name: "geo_region_code",                                       dataType: "STRING",  partition: true,  training: true,  serving: true,  dataLatency: "Offline"  },
  { name: "repayment_rate_90d",   servingName: "repayment_rate",   dataType: "FLOAT",   partition: false, training: true,  serving: true,  dataLatency: "Nearline" },
  { name: "has_overdue",                                           dataType: "BOOLEAN", partition: false, training: true,  serving: false },
  { name: "session_count_14d",                                     dataType: "INT",     partition: false, training: true,  serving: true,  dataLatency: "Online"   },
];

// ─── Version History mock data ────────────────────────────────────────────────
interface VersionConfig {
  dataServer: string;
  tableSchema: string;
  tableName: string;
  datePartition: string;
  partitionType: string;
  updateFrequency: string;
  entitiesColumns: string[];
  filter: string;
  dataLatency: string;
  featureSource: string;
  sourceType: string;
  transformation: string;
}

interface VersionRow {
  version: string;
  createdAt: string;
  createdBy: string;
  status: string;
  publishedAt: string;
  isCurrent: boolean;
  config: VersionConfig;
}

const DEFAULT_VERSIONS: VersionRow[] = [
  {
    version: "v3",
    createdAt: "2026-02-16 08:30",
    createdBy: "cedric.chencan@seamoney.com",
    status: "Online",
    publishedAt: "2026-02-16 09:00",
    isCurrent: true,
    config: {
      dataServer: "reg_sg_hive", tableSchema: "risk_db", tableName: "user_risk_score_ods",
      datePartition: "dt", partitionType: "Incremental Data", updateFrequency: "Daily",
      entitiesColumns: ["platform_user_id"], filter: "dt='2026-02-16'",
      dataLatency: "Online", featureSource: "riskfeat_hbase_th", sourceType: "HBase", transformation: "QueryAaiCache@V2",
    },
  },
  {
    version: "v2",
    createdAt: "2026-01-20 14:00",
    createdBy: "sankar.shyamal@seamoney.com",
    status: "Offline",
    publishedAt: "2026-01-20 15:30",
    isCurrent: false,
    config: {
      dataServer: "reg_sg_hive", tableSchema: "risk_db", tableName: "user_risk_score_ods",
      datePartition: "dt", partitionType: "Incremental Data", updateFrequency: "Daily",
      entitiesColumns: ["platform_user_id"], filter: "",
      dataLatency: "Nearline", featureSource: "riskfeat_hbase_th", sourceType: "HBase", transformation: "QueryAaiCache@V1",
    },
  },
  {
    version: "v1",
    createdAt: "2026-01-05 10:00",
    createdBy: "cedric.chencan@seamoney.com",
    status: "Offline",
    publishedAt: "2026-01-05 11:00",
    isCurrent: false,
    config: {
      dataServer: "reg_sg_hive", tableSchema: "risk_db", tableName: "user_risk_score_v1_ods",
      datePartition: "dt", partitionType: "Incremental Data", updateFrequency: "Daily",
      entitiesColumns: ["platform_user_id"], filter: "",
      dataLatency: "Offline", featureSource: "riskfeat_hbase_th", sourceType: "HBase", transformation: "OfflineFeatureJoin@V1",
    },
  },
];

// ─── Extended config mock ─────────────────────────────────────────────────────
interface DetailConfig {
  module: string;
  dataLatency: "Online" | "Nearline" | "Offline";
  dataServer: "reg_sg_hive" | "reg_us_hive";
  tableSchema: string;
  tableName: string;
  datePartition: string;
  partitionType: "Full Data" | "Incremental Data";
  updateFrequency: string;
  entitiesColumns: string[];
  filter: string;
  featureSource: string;
  sourceType: "HBase" | "Redis" | "gRPC" | "GraphDB";
  fsInputParams: string[];
  transformation: string;
}

const DETAIL_CONFIG: Record<string, DetailConfig> = {
  "1": { module: "Credit Buyer Behavior", dataLatency: "Online",   dataServer: "reg_sg_hive", tableSchema: "risk_db",       tableName: "user_risk_score_ods",      datePartition: "dt",            partitionType: "Incremental Data", updateFrequency: "Daily",    entitiesColumns: ["platform_user_id"],      filter: "dt='2026-02-16'",  featureSource: "riskfeat_hbase_sg",    sourceType: "HBase",   fsInputParams: ["platform_user_id"],               transformation: "QueryAAICache@V2" },
  "2": { module: "External Data",         dataLatency: "Nearline", dataServer: "reg_us_hive", tableSchema: "acard_db",      tableName: "mx_acard_realtime_ods",    datePartition: "event_date",    partitionType: "Full Data",        updateFrequency: "Weekly",   entitiesColumns: ["platform_user_id"],      filter: "",                featureSource: "acard_redis_mx",       sourceType: "Redis",   fsInputParams: ["platform_user_id", "id_card_no"], transformation: "QueryAAICache@V2" },
  "3": { module: "External Data",         dataLatency: "Online",   dataServer: "reg_sg_hive", tableSchema: "embedding_db",  tableName: "th_embedding_v3_ods",      datePartition: "pt",            partitionType: "Full Data",        updateFrequency: "Daily",    entitiesColumns: ["platform_user_id", "item_id"], filter: "",                featureSource: "embed_grpc_th",        sourceType: "gRPC",    fsInputParams: ["platform_user_id", "item_id"],    transformation: "QueryAAICache@V2" },
  "4": { module: "Credit Buyer Behavior", dataLatency: "Offline",  dataServer: "reg_sg_hive", tableSchema: "recommend_db",  tableName: "dp_recommend_score_ods",   datePartition: "dt",            partitionType: "Incremental Data", updateFrequency: "Monthly",  entitiesColumns: ["platform_user_id"],      filter: "",                featureSource: "recommend_graphdb_sg", sourceType: "GraphDB", fsInputParams: ["platform_user_id", "shop_id"],    transformation: "QueryAAICache@V2" },
  "5": { module: "Credit Buyer Behavior", dataLatency: "Online",   dataServer: "reg_sg_hive", tableSchema: "graph_db",      tableName: "user_graph_relation_ods",  datePartition: "stat_date",     partitionType: "Incremental Data", updateFrequency: "Daily",    entitiesColumns: ["platform_user_id", "shop_id"], filter: "is_active=true",  featureSource: "graphrel_hbase_th",    sourceType: "HBase",   fsInputParams: ["platform_user_id", "shop_id"],    transformation: "QueryAAICache@V2" },
  "6": { module: "External Data",         dataLatency: "Nearline", dataServer: "reg_us_hive", tableSchema: "device_db",     tableName: "mx_device_fingerprint_ods",datePartition: "data_date",     partitionType: "Full Data",        updateFrequency: "Daily",    entitiesColumns: ["spp_user_id", "device_id"], filter: "",                featureSource: "devfp_redis_mx",       sourceType: "Redis",   fsInputParams: ["spp_user_id", "device_id"],       transformation: "QueryAAICache@V2" },
};

const DEFAULT_CONFIG: DetailConfig = {
  module: "External Data", dataLatency: "Online", dataServer: "reg_sg_hive",
  tableSchema: "default_db", tableName: "default_table",
  datePartition: "dt", partitionType: "Full Data",
  updateFrequency: "Daily", entitiesColumns: ["platform_user_id"], filter: "",
  featureSource: "default_hbase", sourceType: "HBase",
  fsInputParams: ["platform_user_id"],
  transformation: "QueryAAICache@V2",
};

// ─── Main page component ──────────────────────────────────────────────────────
export default function FeatureGroupDetail() {
  const { fgId } = useParams<{ fgId: string }>();
  const id = fgId;
  const navigate = useNavigate();
  const staticFg = MOCK_DATA.find((f) => f.id === id);
  const ext = (id && DETAIL_CONFIG[id]) ?? DEFAULT_CONFIG;

  const [localFg, setLocalFg] = useState<FeatureGroup | undefined>(staticFg);
  const [modalOpen, setModalOpen] = useState(false);

  const fg = localFg;

  const trainingFeatureCount = DEFAULT_FEATURES.filter(f => f.training).length;
  const servingFeatureCount  = DEFAULT_FEATURES.filter(f => f.serving).length;

  const prefillFormData: Partial<FGFormData> = fg
    ? normalizeFgFormData({
        name: fg.name,
        region: fg.region,
        module: ext.module,
        owners: fg.owner.split(",").map(o => o.trim()),
        description: fg.description,
        dataServer: ext.dataServer,
        tableSchema: ext.tableSchema,
        tableName: ext.tableName,
        datePartition: ext.datePartition,
        partitionType: ext.partitionType,
        updateFrequency: ext.updateFrequency,
        entitiesColumns: ext.entitiesColumns,
        filter: ext.filter,
        featureMapping: {},
        computeFeatures: [],
        featureSource: ext.featureSource,
        sourceType: ext.sourceType,
        fsInputParams: ext.fsInputParams ?? [],
        transformation: ext.transformation,
      } as Partial<FGFormData> & Record<string, unknown>)
    : {};

  if (!fg) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">Feature group not found</p>
          <button
            onClick={() => navigate("/fg")}
            className="mt-4 px-4 py-2 rounded-lg text-white text-sm"
            style={{ backgroundColor: "#13c2c2" }}
          >
            Back to List
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
            <button
              onClick={() => navigate("/fg")}
              className="hover:text-teal-600 transition-colors flex items-center gap-1"
            >
              Feature Groups
            </button>
            <span>/</span>
            <span className="text-gray-700" style={{ fontFamily: "monospace" }}>
              {fg.name}
            </span>
          </div>

          {/* Title Row */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/fg")}
                className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-teal-300 hover:text-teal-600 transition-all flex-shrink-0"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1
                    style={{
                      fontWeight: 700,
                      fontSize: 22,
                      fontFamily: "monospace",
                      color: "#1a1a2e",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {fg.name}
                  </h1>
                  <StatusTag status={fg.status} />
                </div>
                <p className="mt-1 text-sm text-gray-500">{fg.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={fg.status === "Online Changing" || fg.status === "Disable" ? undefined : () => setModalOpen(true)}
                disabled={fg.status === "Online Changing" || fg.status === "Disable"}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg border transition-all ${
                  fg.status === "Online Changing" || fg.status === "Disable"
                    ? "border-gray-100 text-gray-300 bg-gray-50 cursor-not-allowed"
                    : "border-gray-200 text-gray-600 hover:border-teal-300 hover:text-teal-600 hover:bg-teal-50"
                }`}
                style={{ fontWeight: 500 }}
                title={
                  fg.status === "Online Changing" ? "Cannot edit while a change is pending"
                  : fg.status === "Disable" ? "Cannot edit a disabled feature group"
                  : undefined
                }
              >
                <Edit2 size={14} />
                Edit
              </button>
              <ManageDropdown
                status={fg.status}
                onAction={(action) => {
                  if (action === "online" || action === "revoke") {
                    setLocalFg(f => f ? { ...f, status: "Online" } : f);
                  } else if (action === "disable") {
                    setLocalFg(f => f ? { ...f, status: "Disable" } : f);
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-5 space-y-5">
        {/* ─── Three config panels ─── */}
        <div className="grid grid-cols-3 gap-3">
          {/* Basic Info */}
          <ConfigPanel title="Basic Info" icon={<Info size={11} />}>
            <FieldRow label="Region">
              <GrayBadge>{fg.region}</GrayBadge>
            </FieldRow>
            <FieldRow label="Module">
              <PlainVal>{ext.module}</PlainVal>
            </FieldRow>
            <FieldRow label="Owner">
              <div className="flex flex-wrap gap-1">
                {fg.owner.split(",").map((o) => (
                  <GrayBadge key={o}>{o.trim()}</GrayBadge>
                ))}
              </div>
            </FieldRow>
            <FieldRow label="Create Time">
              <PlainVal>{fg.createTime}</PlainVal>
            </FieldRow>
            <FieldRow label="Update Time">
              <PlainVal>{fg.updateTime}</PlainVal>
            </FieldRow>
          </ConfigPanel>

          {/* Training Config */}
          <ConfigPanel title="Training Config" icon={<Database size={11} />}>
            <FieldRow label="Data Server">
              <GrayBadge>{ext.dataServer}</GrayBadge>
            </FieldRow>
            <FieldRow label="Offline Table">
              <PlainVal mono>{ext.tableSchema}.{ext.tableName}</PlainVal>
            </FieldRow>
            <FieldRow label="Date Partition">
              <PlainVal mono>{ext.datePartition}</PlainVal>
            </FieldRow>
            <FieldRow label="Partition Type">
              <GrayBadge>{ext.partitionType}</GrayBadge>
            </FieldRow>
            <FieldRow label="Update Frequency">
              <GrayBadge>{ext.updateFrequency}</GrayBadge>
            </FieldRow>
            <FieldRow label="Entities Column">
              {ext.entitiesColumns.length > 0
                ? <PlainVal mono>{ext.entitiesColumns.join(", ")}</PlainVal>
                : <span className="text-gray-300 text-xs">—</span>
              }
            </FieldRow>
            <FieldRow label="Custom Filter">
              {ext.filter
                ? <PlainVal mono>{ext.filter}</PlainVal>
                : <span className="text-gray-300 text-xs">—</span>
              }
            </FieldRow>
            <FieldRow label="Training Fts">
              <PlainVal>{String(trainingFeatureCount)}</PlainVal>
            </FieldRow>
          </ConfigPanel>

          {/* Serving Config */}
          <ConfigPanel title="Serving Config" icon={<Zap size={11} />}>
            <FieldRow label="Data Latency">
              <GrayBadge>{ext.dataLatency}</GrayBadge>
            </FieldRow>
            <FieldRow label="Feature Source">
              <PlainVal mono>{ext.featureSource}</PlainVal>
            </FieldRow>
            <FieldRow label="Source Type">
              <GrayBadge>{ext.sourceType}</GrayBadge>
            </FieldRow>
            {ext.fsInputParams && ext.fsInputParams.length > 0 && (
              <FieldRow label="Input Params">
                <div className="flex flex-wrap gap-1">
                  {ext.fsInputParams.map(p => (
                    <GrayBadge key={p}><span style={{ fontFamily: "monospace" }}>{p}</span></GrayBadge>
                  ))}
                </div>
              </FieldRow>
            )}
            <FieldRow label="Transformation">
              <PlainVal mono>{ext.transformation}</PlainVal>
            </FieldRow>
            <FieldRow label="Serving Fts">
              <PlainVal>{String(servingFeatureCount)}</PlainVal>
            </FieldRow>
          </ConfigPanel>
        </div>

        {/* Tab section */}
        <DetailTabSection fg={fg} />
      </div>

      {/* Edit Modal */}
      <FeatureGroupModal
        open={modalOpen}
        mode="edit"
        initialData={prefillFormData}
        initialStep={0}
        editId={fg.id}
        modules={INITIAL_MODULES}
        originalStatus={fg.status}
        onClose={() => setModalOpen(false)}
        onSaveDraft={() => setModalOpen(false)}
        onSubmit={() => {
          setLocalFg(f => f ? { ...f, status: "Online Changing" } : f);
          setModalOpen(false);
        }}
      />
    </div>
  );
}

// ─── ConfigPanel ──────────────────────────────────────────────────────────────
function ConfigPanel({
  title, icon, children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className="bg-white rounded-xl border border-gray-200 overflow-hidden"
      style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
    >
      {/* Panel header */}
      <div
        className="flex items-center gap-1.5 px-4 py-2.5 border-b border-gray-100"
        style={{ background: "linear-gradient(to right, rgba(19,194,194,0.04), transparent)" }}
      >
        <span style={{ color: "#13c2c2" }}>{icon}</span>
        <span className="text-xs" style={{ fontWeight: 700, color: "#0e9494", letterSpacing: "0.03em", textTransform: "uppercase" }}>
          {title}
        </span>
      </div>
      {/* Fields */}
      <div className="px-4 py-2 divide-y divide-gray-50">
        {children}
      </div>
    </div>
  );
}

// ─── FieldRow ────────────────────────────────────────────────────────────────
function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 py-1.5 min-w-0">
      <span
        className="flex-shrink-0 text-gray-400 text-xs"
        style={{ fontWeight: 500, width: 90 }}
      >
        {label}
      </span>
      <div className="flex-1 min-w-0 flex items-center">{children}</div>
    </div>
  );
}

// ─── TealBadge ────────────────────────────────────────────────────────────────
function TealBadge({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md text-xs truncate max-w-full"
      style={{
        background: "rgba(19,194,194,0.08)",
        color: "#0e9494",
        border: "1px solid rgba(19,194,194,0.18)",
        fontWeight: 600,
      }}
    >
      {children}
    </span>
  );
}

// ─── GrayBadge ────────────────────────────────────────────────────────────────
function GrayBadge({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md text-xs"
      style={{
        background: "#f3f4f6",
        color: "#374151",
        border: "1px solid #e5e7eb",
        fontWeight: 500,
      }}
    >
      {children}
    </span>
  );
}

// ─── PlainVal ─────────────────────────────────────────────────────────────────
function PlainVal({ children, mono = false }: { children: React.ReactNode; mono?: boolean }) {
  return (
    <span
      className="text-xs text-gray-700 truncate max-w-full"
      style={{ fontWeight: 500, fontFamily: mono ? "monospace" : undefined }}
    >
      {children}
    </span>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="text-sm text-gray-400 mb-3 flex items-center gap-2"
      style={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}
    >
      <span className="w-4 h-0.5 rounded" style={{ backgroundColor: "#13c2c2" }} />
      {children}
    </h2>
  );
}

// ─── AvailDot ─────────────────────────────────────────────────────────────────
function AvailDot({ value }: { value: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`w-2 h-2 rounded-full flex-shrink-0 ${value ? "bg-emerald-500" : "bg-gray-300"}`}
      />
      <span className={`text-xs ${value ? "text-gray-700" : "text-gray-400"}`}>
        {value ? "TRUE" : "FALSE"}
      </span>
    </span>
  );
}

// ─── SortBtn ──────────────────────────────────────────────────────────────────
function SortBtn({
  col,
  activeCol,
  dir,
  onSort,
}: {
  col: string;
  activeCol: string | null;
  dir: "asc" | "desc";
  onSort: (c: string) => void;
}) {
  const active = activeCol === col;
  return (
    <button
      onClick={() => onSort(col)}
      className={`inline-flex items-center ml-0.5 transition-colors ${
        active ? "text-teal-500" : "text-gray-300 hover:text-gray-400"
      }`}
    >
      {active ? (
        dir === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />
      ) : (
        <ArrowUpDown size={11} />
      )}
    </button>
  );
}

// ─── FilterPopover ────────────────────────────────────────────────────────────
function FilterPopover({
  isOpen, value, onChange, onClose, placeholder, isBool, options,
}: {
  isOpen: boolean;
  value: string;
  onChange: (v: string) => void;
  onClose: () => void;
  placeholder?: string;
  isBool?: boolean;
  options?: string[];
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isEnum = isBool || !!options;
  const enumOpts = isBool
    ? [{ label: "All", val: "" }, { label: "TRUE", val: "true" }, { label: "FALSE", val: "false" }]
    : [{ label: "All", val: "" }, ...(options ?? []).map(o => ({ label: o, val: o }))];

  return (
    <div
      ref={ref}
      className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50"
      style={{ minWidth: isEnum ? 120 : 160 }}
    >
      {isEnum ? (
        <div className="py-1">
          {enumOpts.map((opt) => (
            <button
              key={opt.val}
              onClick={() => { onChange(opt.val); onClose(); }}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors ${
                value === opt.val ? "bg-teal-50 text-teal-600" : "hover:bg-gray-50 text-gray-600"
              }`}
            >
              {isBool && opt.val === "true"  && <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />}
              {isBool && opt.val === "false" && <span className="w-2 h-2 rounded-full bg-gray-300 flex-shrink-0" />}
              {isBool && opt.val === ""      && <span className="w-2 h-2 flex-shrink-0" />}
              {!isBool && opt.val === ""     && <span className="w-2 h-2 flex-shrink-0" />}
              {!isBool && opt.val === "Online"   && <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />}
              {!isBool && opt.val === "Nearline" && <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />}
              {!isBool && opt.val === "Offline"  && <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />}
              {opt.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="p-2">
          <input
            autoFocus
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder ?? "Filter…"}
            className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:border-teal-400"
          />
        </div>
      )}
    </div>
  );
}

// ─── Feature List Tab ─────────────────────────────────────────────────────────
function FeatureListTab({ fg }: { fg: FeatureGroup }) {
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const features = DEFAULT_FEATURES;

  function handleSort(col: string) {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
    setPage(1);
  }

  function setFilter(col: string, val: string) {
    setFilters((f) => ({ ...f, [col]: val }));
    setPage(1);
  }

  function toggleFilter(col: string) {
    setOpenFilter((v) => (v === col ? null : col));
  }

  const filtered = features.filter((f) => {
    if (filters.name) {
      const q = filters.name.toLowerCase();
      const matchTrain   = f.name.toLowerCase().includes(q);
      const matchServing = f.servingName?.toLowerCase().includes(q) ?? false;
      if (!matchTrain && !matchServing) return false;
    }
    if (filters.dataType && !f.dataType.toLowerCase().includes(filters.dataType.toLowerCase())) return false;
    if (filters.partition === "true"  && !f.partition) return false;
    if (filters.partition === "false" &&  f.partition) return false;
    if (filters.training  === "true"  && !f.training)  return false;
    if (filters.training  === "false" &&  f.training)  return false;
    if (filters.serving   === "true"  && !f.serving)   return false;
    if (filters.serving   === "false" &&  f.serving)   return false;
    if (filters.dataLatency && f.dataLatency !== filters.dataLatency) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (!sortCol) return 0;
    const av = String(a[sortCol as keyof FeatureRow]);
    const bv = String(b[sortCol as keyof FeatureRow]);
    return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  const total      = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const paged      = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const hasFilter = (col: string) => !!filters[col];

  const BOOL_COLS: { key: keyof FeatureRow; label: string }[] = [
    { key: "partition", label: "Partition" },
    { key: "training",  label: "Training"  },
    { key: "serving",   label: "Serving"   },
  ];

  // Count features with serving aliases
  const aliasCount = features.filter(f => f.servingName && f.servingName !== f.name).length;

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      {/* Legend bar */}
      {aliasCount > 0 && (
        <div
          className="flex items-center gap-3 px-5 py-2 border-b"
          style={{ background: "rgba(19,194,194,0.03)", borderColor: "rgba(19,194,194,0.12)" }}
        >
          <Info size={12} style={{ color: "#13c2c2", flexShrink: 0 }} />
          <span className="text-xs" style={{ color: "#4b5563", fontWeight: 500 }}>
            Feature Name column shows the{" "}
            <span style={{ fontFamily: "monospace", color: "#13c2c2", fontWeight: 700 }}>training name</span>
            {" "}as primary. Features with a different serving alias show{" "}
            <span style={{ fontFamily: "monospace", color: "#6b7280", fontSize: 11 }}>↳ serving_name</span>
            {" "}below ({aliasCount} aliased in this group).
          </span>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
          <thead>
            <tr style={{ backgroundColor: "#fafafa" }} className="border-b border-gray-100 text-xs text-gray-500">
              {/* Feature */}
              <th className="px-5 py-3 text-left" style={{ fontWeight: 600, position: "relative", width: "34%" }}>
                <div className="flex items-center gap-1">
                  <span>Feature Name</span>
                  <SortBtn col="name" activeCol={sortCol} dir={sortDir} onSort={handleSort} />
                  <button
                    onClick={() => toggleFilter("name")}
                    className={`transition-colors ${hasFilter("name") ? "text-teal-500" : "text-gray-300 hover:text-gray-400"}`}
                  >
                    <Filter size={10} />
                  </button>
                  {/* Legend indicator */}
                  <span
                    className="ml-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded"
                    style={{ background: "#f3f4f6", border: "1px solid #e5e7eb" }}
                  >
                    <span style={{ fontSize: 9, fontWeight: 700, color: "#13c2c2", fontFamily: "monospace" }}>T</span>
                    <span style={{ fontSize: 9, color: "#d1d5db" }}>·</span>
                    <span style={{ fontSize: 9, fontWeight: 700, color: "#9ca3af", fontFamily: "monospace" }}>S</span>
                  </span>
                </div>
                <FilterPopover
                  isOpen={openFilter === "name"}
                  value={filters.name ?? ""}
                  onChange={(v) => setFilter("name", v)}
                  onClose={() => setOpenFilter(null)}
                  placeholder="Search training or serving name…"
                />
              </th>

              {/* Data Type */}
              <th className="px-5 py-3 text-left" style={{ fontWeight: 600, position: "relative", width: "22%" }}>
                <div className="flex items-center gap-0.5">
                  Data Type
                  <SortBtn col="dataType" activeCol={sortCol} dir={sortDir} onSort={handleSort} />
                  <button
                    onClick={() => toggleFilter("dataType")}
                    className={`ml-0.5 transition-colors ${hasFilter("dataType") ? "text-teal-500" : "text-gray-300 hover:text-gray-400"}`}
                  >
                    <Filter size={10} />
                  </button>
                </div>
                <FilterPopover
                  isOpen={openFilter === "dataType"}
                  value={filters.dataType ?? ""}
                  onChange={(v) => setFilter("dataType", v)}
                  onClose={() => setOpenFilter(null)}
                  placeholder="e.g. FLOAT"
                />
              </th>

              {/* Bool columns */}
              {BOOL_COLS.map(({ key, label }) => (
                <th
                  key={key}
                  className="px-5 py-3 text-left"
                  style={{ fontWeight: 600, position: "relative", width: "12%" }}
                >
                  <div className="flex items-center gap-0.5">
                    {label}
                    <button
                      onClick={() => toggleFilter(key)}
                      className={`ml-0.5 transition-colors ${hasFilter(key) ? "text-teal-500" : "text-gray-300 hover:text-gray-400"}`}
                    >
                      <Filter size={10} />
                    </button>
                  </div>
                  <FilterPopover
                    isOpen={openFilter === key}
                    value={filters[key] ?? ""}
                    onChange={(v) => setFilter(key, v)}
                    onClose={() => setOpenFilter(null)}
                    isBool
                  />
                </th>
              ))}
              {/* Data Latency column header */}
              <th className="px-5 py-3 text-left" style={{ fontWeight: 600, position: "relative", width: "14%" }}>
                <div className="flex items-center gap-0.5">
                  Data Latency
                  <button
                    onClick={() => toggleFilter("dataLatency")}
                    className={`ml-0.5 transition-colors ${hasFilter("dataLatency") ? "text-teal-500" : "text-gray-300 hover:text-gray-400"}`}
                  >
                    <Filter size={10} />
                  </button>
                </div>
                <FilterPopover
                  isOpen={openFilter === "dataLatency"}
                  value={filters.dataLatency ?? ""}
                  onChange={(v) => setFilter("dataLatency", v)}
                  onClose={() => setOpenFilter(null)}
                  options={["Online", "Nearline", "Offline"]}
                />
              </th>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400 text-sm">
                  No features match the current filters
                </td>
              </tr>
            ) : (
              paged.map((f, i) => (
                <tr
                  key={i}
                  className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors"
                >
                  <td className="px-5 py-3">
                    <div className="flex flex-col gap-0.5">
                      {/* Training name — primary identifier */}
                      <span style={{ fontFamily: "monospace", color: "#13c2c2", fontWeight: 600, fontSize: 13 }}>
                        {f.name}
                      </span>
                      {/* Serving alias — only when different */}
                      {f.servingName && f.servingName !== f.name && (
                        <span
                          className="inline-flex items-center gap-1"
                          style={{ fontFamily: "monospace", color: "#9ca3af", fontSize: 11 }}
                        >
                          <span style={{ color: "#d1d5db", fontSize: 10 }}>↳</span>
                          <span style={{ color: "#6b7280" }}>{f.servingName}</span>
                          <span
                            className="inline-flex items-center px-1 rounded"
                            style={{
                              fontSize: 9, fontWeight: 700, letterSpacing: "0.04em",
                              background: "rgba(19,194,194,0.08)",
                              color: "#0e9494",
                              border: "1px solid rgba(19,194,194,0.18)",
                              fontFamily: "sans-serif",
                            }}
                          >
                            serving
                          </span>
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-xs font-mono text-gray-600">{f.dataType}</td>
                  <td className="px-5 py-3"><AvailDot value={f.partition} /></td>
                  <td className="px-5 py-3"><AvailDot value={f.training}  /></td>
                  <td className="px-5 py-3"><AvailDot value={f.serving}   /></td>
                  <td className="px-5 py-3 text-xs" style={{ color: "#374151" }}>
                    {f.serving && f.dataLatency
                      ? f.dataLatency
                      : <span className="text-gray-300">—</span>
                    }
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
        <span className="text-xs text-gray-400">
          {total === 0
            ? "0 items"
            : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total} items`}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-2.5 py-1 text-xs border border-gray-200 rounded hover:border-teal-400 hover:text-teal-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            «
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-7 h-7 text-xs rounded border transition-colors ${
                p === page
                  ? "border-teal-500 bg-teal-500 text-white"
                  : "border-gray-200 hover:border-teal-400 hover:text-teal-600"
              }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-2.5 py-1 text-xs border border-gray-200 rounded hover:border-teal-400 hover:text-teal-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            »
          </button>
          <span className="ml-2 text-xs text-gray-400">20 / page</span>
        </div>
      </div>
    </div>
  );
}

// ─── Lineage Tab (placeholder) ────────────────────────────────────────────────
function LineageTab() {
  return (
    <div
      className="bg-white rounded-xl border border-gray-200 flex flex-col items-center justify-center text-center"
      style={{ minHeight: 300 }}
    >
      <GitBranch size={40} className="mb-3" style={{ color: "#d1d5db" }} />
      <p className="text-sm text-gray-400" style={{ fontWeight: 500 }}>
        Lineage visualization coming soon
      </p>
      <p className="text-xs text-gray-300 mt-1">
        Upstream and downstream dependencies will be displayed here
      </p>
    </div>
  );
}

// ─── Offline DQC Tab (placeholder) ───────────────────────────────────────────
function OfflineDQCTab() {
  return (
    <div
      className="bg-white rounded-xl border border-gray-200 flex flex-col items-center justify-center text-center"
      style={{ minHeight: 300 }}
    >
      <Activity size={40} className="mb-3" style={{ color: "#d1d5db" }} />
      <p className="text-sm text-gray-400" style={{ fontWeight: 500 }}>
        Consistency check results coming soon
      </p>
      <p className="text-xs text-gray-300 mt-1">
        Offline DQC alignment data will appear here
      </p>
    </div>
  );
}

// ─── Version History Tab ──────────────────────────────────────────────────────
function VersionStatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as FeatureGroupStatus] ?? STATUS_CONFIG.Offline;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border ${cfg.bg} ${cfg.text} ${cfg.border}`}
      style={{ fontWeight: 500 }}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {status}
    </span>
  );
}

function VersionHistoryTab() {
  const [hovered, setHovered] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const TRAINING_KEYS: (keyof VersionConfig)[] = [
    "dataServer", "tableSchema", "tableName", "datePartition", "partitionType",
    "updateFrequency", "entitiesColumns", "filter",
  ];
  const SERVING_KEYS:  (keyof VersionConfig)[] = ["dataLatency", "featureSource", "sourceType", "transformation"];

  function showTooltip(version: string) {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setHovered(version);
  }

  function scheduleHide() {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setHovered(null), 320);
  }

  function buildJsonText(config: VersionConfig): string {
    const tLines = TRAINING_KEYS.map(k => `  "${k}": ${JSON.stringify(config[k] || "")}`);
    const sLines = SERVING_KEYS.map(k  => `  "${k}": ${JSON.stringify(config[k] || "")}`);
    return (
      "{\n" +
      "  // Training Config\n" +
      tLines.join(",\n") + ",\n\n" +
      "  // Serving Config\n" +
      sLines.join(",\n") + "\n" +
      "}"
    );
  }

  function handleCopy(v: VersionRow, e: React.MouseEvent) {
    e.stopPropagation();
    if (hideTimer.current) clearTimeout(hideTimer.current);

    const text = buildJsonText(v.config);

    function onSuccess() {
      setCopied(v.version);
      setTimeout(() => setCopied(null), 1800);
    }

    function execCommandFallback() {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none;";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        onSuccess();
      } catch {
        // silent fail — nothing to do
      }
    }

    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      navigator.clipboard.writeText(text).then(onSuccess).catch(execCommandFallback);
    } else {
      execCommandFallback();
    }
  }

  // Light-theme syntax renderer (GitHub style)
  function renderLine(line: string, idx: number) {
    if (line.trimStart().startsWith("//")) {
      return <div key={idx} style={{ color: "#6e7781", fontStyle: "italic" }}>{line}</div>;
    }
    if (line.trim() === "{" || line.trim() === "}") {
      return <div key={idx} style={{ color: "#24292f" }}>{line}</div>;
    }
    if (line.trim() === "") return <div key={idx} style={{ height: "0.55em" }} />;
    const m = line.match(/^(\s*)("[\w]+")\s*:\s*(".*?"|null|true|false|\d+)(,?)$/);
    if (m) {
      return (
        <div key={idx}>
          <span>{m[1]}</span>
          <span style={{ color: "#0550ae" }}>{m[2]}</span>
          <span style={{ color: "#24292f" }}>: </span>
          <span style={{ color: m[3] === '""' ? "#8c959f" : "#1a7f37" }}>{m[3]}</span>
          <span style={{ color: "#6e7781" }}>{m[4]}</span>
        </div>
      );
    }
    return <div key={idx} style={{ color: "#24292f" }}>{line}</div>;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-visible">
      <table className="w-full text-sm" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
        <thead>
          <tr style={{ backgroundColor: "#fafafa" }} className="border-b border-gray-100 text-xs text-gray-500">
            {["Version", "Created At", "Created By", "Published At", "Action"].map((h) => (
              <th key={h} className="px-5 py-3 text-left" style={{ fontWeight: 600 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DEFAULT_VERSIONS.map((v) => (
            <tr key={v.version} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
              <td className="px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#1a1a2e" }}>{v.version}</span>
                  {v.isCurrent && (
                    <span className="px-1.5 py-0.5 rounded text-[10px]"
                      style={{ background: "rgba(19,194,194,0.10)", color: "#13c2c2", border: "1px solid rgba(19,194,194,0.25)", fontWeight: 600 }}>
                      Current
                    </span>
                  )}
                </div>
              </td>
              <td className="px-5 py-3.5 text-xs text-gray-500">{v.createdAt}</td>
              <td className="px-5 py-3.5 text-xs text-gray-600">{v.createdBy}</td>
              <td className="px-5 py-3.5 text-xs text-gray-500">{v.publishedAt}</td>
              <td className="px-5 py-3.5">
                <div className="flex items-center gap-2">
                  {/* Details — trigger + tooltip both cancel the hide timer on hover */}
                  <div
                    className="relative"
                    onMouseEnter={() => showTooltip(v.version)}
                    onMouseLeave={scheduleHide}
                  >
                    <button
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded border border-gray-200 text-gray-600 hover:border-teal-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                      style={{ fontWeight: 500 }}
                    >
                      <Info size={11} />
                      Details
                    </button>

                    {hovered === v.version && (
                      <div
                        className="absolute z-50 rounded-xl overflow-hidden"
                        style={{
                          bottom: "calc(100% + 8px)",
                          left: 0,
                          minWidth: 380,
                          background: "#ffffff",
                          border: "1px solid #d0d7de",
                          boxShadow: "0 8px 24px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06)",
                        }}
                        onMouseEnter={() => showTooltip(v.version)}
                        onMouseLeave={scheduleHide}
                      >
                        {/* Toolbar */}
                        <div
                          className="flex items-center justify-between px-4 py-2"
                          style={{ background: "#f6f8fa", borderBottom: "1px solid #d0d7de" }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs" style={{ color: "#57606a", fontFamily: "monospace" }}>
                              config.json
                            </span>
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded"
                              style={{ background: "rgba(19,194,194,0.10)", color: "#0e9494", border: "1px solid rgba(19,194,194,0.22)", fontWeight: 700 }}
                            >
                              {v.version}
                            </span>
                          </div>
                          <button
                            onClick={(e) => handleCopy(v, e)}
                            className="flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-all"
                            style={{
                              color: copied === v.version ? "#1a7f37" : "#57606a",
                              background: copied === v.version ? "rgba(26,127,55,0.08)" : "transparent",
                              border: `1px solid ${copied === v.version ? "rgba(26,127,55,0.3)" : "#d0d7de"}`,
                              fontWeight: 500,
                            }}
                          >
                            {copied === v.version
                              ? <><Check size={10} /> Copied!</>
                              : <><Copy size={10} /> Copy</>
                            }
                          </button>
                        </div>

                        {/* Code area */}
                        <pre
                          style={{
                            fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
                            fontSize: 11.5,
                            lineHeight: 1.75,
                            margin: 0,
                            padding: "12px 16px",
                            maxHeight: 340,
                            overflowY: "auto",
                            background: "#ffffff",
                            color: "#24292f",
                          }}
                        >
                          {buildJsonText(v.config).split("\n").map((line, i) => renderLine(line, i))}
                        </pre>

                        {/* Downward arrow */}
                        <div
                          className="absolute"
                          style={{
                            width: 10, height: 10,
                            bottom: -6, left: 22,
                            transform: "rotate(45deg)",
                            background: "#ffffff",
                            borderRight: "1px solid #d0d7de",
                            borderBottom: "1px solid #d0d7de",
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {!v.isCurrent && (
                    <button
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded border border-gray-200 text-gray-500 hover:border-amber-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                      style={{ fontWeight: 500 }}
                    >
                      <RotateCcw size={11} />
                      Rollback
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Detail Tab Section ───────────────────────────────────────────────────────
type DetailTab = "features" | "lineage" | "dqc" | "versions";

const DETAIL_TABS: { key: DetailTab; label: string }[] = [
  { key: "features", label: "Feature List" },
  { key: "lineage",  label: "Lineage"                     },
  { key: "dqc",      label: "Offline DQC"                 },
  { key: "versions", label: "Version History"             },
];

function DetailTabSection({ fg }: { fg: FeatureGroup }) {
  const [active, setActive] = useState<DetailTab>("features");

  return (
    <div>
      {/* Tab bar */}
      <div className="flex items-center border-b border-gray-200 -mx-0 mb-4">
        {DETAIL_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            className={`px-4 py-2.5 text-sm border-b-2 -mb-px transition-colors ${
              active === tab.key
                ? "border-teal-500 text-teal-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
            style={{ fontWeight: active === tab.key ? 600 : 400 }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {active === "features" && <FeatureListTab fg={fg} />}
      {active === "lineage"  && <LineageTab />}
      {active === "dqc"      && <OfflineDQCTab />}
      {active === "versions" && <VersionHistoryTab />}
    </div>
  );
}

// ─── Manage Dropdown ──────────────────────────────────────────────────────────
type ManageAction = "online" | "revoke" | "disable" | "delete";

function ManageDropdown({
  status,
  onAction,
}: {
  status: FeatureGroupStatus;
  onAction: (a: ManageAction) => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirmDisable, setConfirmDisable] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setConfirmDisable(false);
      }
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const canOnline  = ["Disable", "Online Changing"].includes(status);
  const canRevoke  = status === "Online Changing";
  const canDisable = status === "Online";
  const canDelete  = ["Draft", "Disable"].includes(status);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen((v) => !v); setConfirmDisable(false); }}
        className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg text-white transition-all hover:opacity-90"
        style={{ backgroundColor: "#13c2c2", fontWeight: 500 }}
      >
        Manage
        <ChevronDown size={13} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden"
          style={{ minWidth: 160 }}
        >
          {!confirmDisable ? (
            <div className="py-1">
              <DetailMenuItem
                icon={<CheckCircle2 size={13} />}
                label="Online"
                enabled={canOnline}
                iconColor="text-emerald-500"
                hoverColor="hover:bg-emerald-50 hover:text-emerald-700"
                onClick={() => { onAction("online"); setOpen(false); }}
              />
              <DetailMenuItem
                icon={<RotateCcw size={13} />}
                label="Revoke"
                enabled={canRevoke}
                iconColor="text-amber-500"
                hoverColor="hover:bg-amber-50 hover:text-amber-600"
                onClick={() => { onAction("revoke"); setOpen(false); }}
              />
              <DetailMenuItem
                icon={<Ban size={13} />}
                label="Disable"
                enabled={canDisable}
                iconColor="text-orange-400"
                hoverColor="hover:bg-orange-50 hover:text-orange-600"
                onClick={() => setConfirmDisable(true)}
              />
              <div className="h-px bg-gray-100 my-1" />
              <DetailMenuItem
                icon={<Trash2 size={13} />}
                label="Delete"
                enabled={canDelete}
                iconColor="text-red-500"
                hoverColor="hover:bg-red-50 hover:text-red-600"
                danger
                onClick={() => { onAction("delete"); setOpen(false); }}
              />
            </div>
          ) : (
            <div className="p-4" style={{ width: 224 }}>
              <div className="flex gap-2.5 mb-3.5">
                <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" style={{ color: "#fa8c16" }} />
                <p className="text-xs text-gray-700 leading-relaxed">
                  确认要将该 Feature Group 设为{" "}
                  <span style={{ fontWeight: 600 }}>Disable</span> 吗？此操作不可立即撤销。
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setConfirmDisable(false)}
                  className="px-3 py-1 text-xs rounded border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={() => { onAction("disable"); setOpen(false); setConfirmDisable(false); }}
                  className="px-3 py-1 text-xs rounded text-white transition-all hover:opacity-90"
                  style={{ backgroundColor: "#fa8c16", fontWeight: 500 }}
                >
                  确认 Disable
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DetailMenuItem({
  icon,
  label,
  enabled,
  iconColor,
  hoverColor,
  danger = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  enabled: boolean;
  iconColor: string;
  hoverColor: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      disabled={!enabled}
      onClick={enabled ? onClick : undefined}
      className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-left transition-colors ${
        enabled
          ? `${danger ? "text-red-600" : "text-gray-700"} ${hoverColor} cursor-pointer`
          : "text-gray-300 cursor-not-allowed"
      }`}
    >
      <span className={enabled ? iconColor : "text-gray-300"}>{icon}</span>
      {label}
      {!enabled && (
        <span className="ml-auto text-gray-300" style={{ fontSize: 10 }}>
          N/A
        </span>
      )}
    </button>
  );
}