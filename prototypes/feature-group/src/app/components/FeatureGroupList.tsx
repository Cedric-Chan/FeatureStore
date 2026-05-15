import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { FEATURE_GROUP_HTML } from "./featureGroupHtml";
import FeatureGroupModal, { type FGFormData } from "./FeatureGroupModal";
import {
  MapPin,
  Layers,
  User,
  Clock,
  Plus,
  FolderOpen,
  RefreshCw,
  Settings,
  ChevronRight,
  ChevronDown,
  Edit2,
  Search,
  CheckCircle2,
  Ban,
  Trash2,
  AlertTriangle,
  X,
  FilePlus,
  AlertCircle,
  RotateCcw,
  Database,
  Zap,
  Copy,
} from "lucide-react";

export type FeatureGroupStatus = "Online" | "Online Changing" | "Draft" | "Disable" | "Offline";

export interface FeatureGroup {
  id: string;
  name: string;
  status: FeatureGroupStatus;
  region: string;
  module: string;
  owner: string;
  createTime: string;
  updateTime: string;
  description: string;
  /** Internal: form data preserved for draft editing */
  _formData?: Partial<FGFormData>;
  /** Internal: last saved step index */
  _savedStep?: number;
}

// ─── Initial mock data ────────────────────────────────────────────────────────
const INITIAL_MOCK: FeatureGroup[] = [
  {
    id: "1",
    name: "user_risk_score_fg",
    status: "Online",
    region: "TH",
    module: "Credit Buyer Behavior",
    owner: "cedric.chencan@seamoney.com,sankar.shyamal@seamoney.com",
    createTime: "2026-02-14 10:00:00",
    updateTime: "2026-02-16 08:30:00",
    description: "User risk scoring feature group for Thailand market, aggregates behavioral signals and transaction patterns.",
    _formData: {
      name: "user_risk_score_fg", region: "TH", module: "Credit Buyer Behavior",
      owners: ["cedric.chencan@seamoney.com", "sankar.shyamal@seamoney.com"],
      description: "User risk scoring feature group for Thailand market, aggregates behavioral signals and transaction patterns.",
      dataServer: "reg_sg_hive", tableSchema: "risk_db", tableName: "user_risk_score_ods",
      marker: "user_risk_score_ods", filter: "dt='2026-02-16'",
      dataLatency: "Online", featureSource: "riskfeat_hbase_th", sourceType: "HBase", transformation: "QueryAaiCache@V2",
    },
  },
  {
    id: "2",
    name: "mx_acard_realtime_fg",
    status: "Online Changing",
    region: "MX",
    module: "External Data",
    owner: "zhengyi.loh@seamoney.com",
    createTime: "2026-02-10 14:20:00",
    updateTime: "2026-02-15 11:00:00",
    description: "Real-time feature group for Mexico A-card model, capturing live transaction velocity and account age features.",
    _formData: {
      name: "mx_acard_realtime_fg", region: "MX", module: "External Data",
      owners: ["zhengyi.loh@seamoney.com"],
      description: "Real-time feature group for Mexico A-card model, capturing live transaction velocity and account age features.",
      dataServer: "reg_us_hive", tableSchema: "acard_db", tableName: "mx_acard_realtime_ods",
      marker: "mx_acard_realtime_ods", filter: "",
      dataLatency: "Nearline", featureSource: "mx_redis_cache", sourceType: "Redis", transformation: "QueryAaiCache@V2",
    },
  },
  {
    id: "3",
    name: "th_embedding_fg_v3",
    status: "Online",
    region: "TH",
    module: "External Data",
    owner: "sankar.shyamal@seamoney.com",
    createTime: "2026-02-08 09:30:00",
    updateTime: "2026-02-11 16:20:00",
    description: "Version 3 of Thailand embedding feature group, includes improved user graph embeddings and NLP-derived features.",
    _formData: {
      name: "th_embedding_fg_v3", region: "TH", module: "External Data",
      owners: ["sankar.shyamal@seamoney.com", "huangwei@shopee.com"],
      description: "Version 3 of Thailand embedding feature group, includes improved user graph embeddings and NLP-derived features.",
      dataServer: "reg_sg_hive", tableSchema: "embedding_db", tableName: "th_embedding_v3_ods",
      marker: "th_embedding_v3_ods", filter: "",
      dataLatency: "Online", featureSource: "riskfeat_hbase_th", sourceType: "HBase", transformation: "OfflineFeatureJoin@V2",
    },
  },
  {
    id: "4",
    name: "dp_recommend_score_fg",
    status: "Draft",
    region: "SHOPEE_SG",
    module: "Credit Buyer Behavior",
    owner: "huangwei@shopee.com",
    createTime: "2026-02-16 13:45:00",
    updateTime: "2026-02-16 13:45:00",
    description: "Draft feature group for Shopee Singapore recommendation scoring, currently under review and validation.",
    _formData: {
      name: "dp_recommend_score_fg",
      region: "SHOPEE_SG",
      module: "Credit Buyer Behavior",
      owners: ["huangwei@shopee.com"],
      description: "Draft feature group for Shopee Singapore recommendation scoring, currently under review and validation.",
      dataServer: "reg_sg_hive",
      tableSchema: "recommend_db",
      tableName: "dp_recommend_score_ods",
      marker: "dp_recommend_score_ods",
      filter: "",
      dataLatency: "",
      featureSource: "",
      sourceType: "",
      transformation: "",
    },
    _savedStep: 1,
  },
  {
    id: "5",
    name: "user_graph_relation_fg",
    status: "Online",
    region: "TH",
    module: "Credit Buyer Behavior",
    owner: "cedric.chencan@seamoney.com",
    createTime: "2026-02-06 11:00:00",
    updateTime: "2026-02-13 09:00:00",
    description: "User social graph and relation feature group, derives network-based features for fraud detection models.",
    _formData: {
      name: "user_graph_relation_fg", region: "TH", module: "Credit Buyer Behavior",
      owners: ["cedric.chencan@seamoney.com", "zhengyi.loh@seamoney.com"],
      description: "User social graph and relation feature group, derives network-based features for fraud detection models.",
      dataServer: "reg_sg_hive", tableSchema: "graph_db", tableName: "user_graph_relation_ods",
      marker: "user_graph_relation_ods", filter: "is_active=true",
      dataLatency: "Online", featureSource: "th_graph_relation", sourceType: "GraphDB", transformation: "QueryAaiCache@V3",
    },
  },
  {
    id: "6",
    name: "mx_device_fingerprint_fg",
    status: "Online Changing",
    region: "MX",
    module: "External Data",
    owner: "xiaochen.kuang@monee.com",
    createTime: "2026-01-28 15:30:00",
    updateTime: "2026-02-15 20:00:00",
    description: "Device fingerprint feature group for Mexico, tracks device identity signals and cross-device behavior patterns.",
    _formData: {
      name: "mx_device_fingerprint_fg", region: "MX", module: "External Data",
      owners: ["xiaochen.kuang@monee.com"],
      description: "Device fingerprint feature group for Mexico, tracks device identity signals and cross-device behavior patterns.",
      dataServer: "reg_us_hive", tableSchema: "device_db", tableName: "mx_device_fingerprint_ods",
      marker: "mx_device_fingerprint_ods", filter: "",
      dataLatency: "Nearline", featureSource: "mx_redis_cache", sourceType: "Redis", transformation: "MxRealtimeScore@V1",
    },
  },
];

// ─── Module directory ───────────────────────────────────────────────────────
export const INITIAL_MODULES = [
  "System",
  "Credit Buyer Behavior",
  "Credit Seller Behavior",
  "E-Commerce Buyer Behavior",
  "E-Commerce Seller Behavior",
  "Offline Seller Service",
  "Shopee Pay",
  "Shopee Food",
  "Data Point",
  "Linked Features",
  "Phone",
  "Application",
  "External Data",
];

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<
  FeatureGroupStatus,
  { label: string; bg: string; text: string; dot: string; border: string }
> = {
  Online:            { label: "Online",          bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", border: "border-emerald-200" },
  "Online Changing": { label: "Online Changing", bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-500",   border: "border-amber-200"  },
  Draft:             { label: "Draft",           bg: "bg-slate-100",  text: "text-slate-600",   dot: "bg-slate-400",   border: "border-slate-200"  },
  Offline:           { label: "Offline",         bg: "bg-red-50",     text: "text-red-600",     dot: "bg-red-400",     border: "border-red-200"    },
  Disable:           { label: "Offline",         bg: "bg-red-50",    text: "text-red-600",    dot: "bg-red-400",    border: "border-red-200"   },
};

function StatusTag({ status }: { status: FeatureGroupStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs border ${cfg.bg} ${cfg.text} ${cfg.border}`}
      style={{ fontWeight: 500 }}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ─── Fts count tags ───────────────────────────────────────────────────────────
const MOCK_FT_COUNTS: Record<string, { train: number; serve: number }> = {
  "1": { train: 13, serve: 11 },
  "2": { train: 8,  serve: 8  },
  "3": { train: 20, serve: 15 },
  "4": { train: 5,  serve: 0  },
  "5": { train: 17, serve: 12 },
  "6": { train: 10, serve: 9  },
};

function FtsTag({ type, count }: { type: "training" | "serving"; count: number }) {
  const isTraining = type === "training";
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs border"
      style={{ background: "#ffffff", borderColor: "#e5e7eb" }}
    >
      {isTraining
        ? <Database size={10} style={{ color: "#b0b8c4", flexShrink: 0 }} />
        : <Zap       size={10} style={{ color: "#b0b8c4", flexShrink: 0 }} />
      }
      <span style={{ color: "#9ca3af" }}>{isTraining ? "for Training" : "for Serving"}</span>
      <span style={{ color: "#374151" }}>{count}</span>
    </span>
  );
}

function MetaItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 text-sm text-gray-500 min-w-0">
      <span className="flex-shrink-0 text-gray-400">{icon}</span>
      <span className="flex-shrink-0 text-gray-400 text-xs">{label}:</span>
      <span
        className="truncate px-2 py-0.5 rounded-md text-xs"
        style={{
          fontWeight: 600,
          backgroundColor: "rgba(19,194,194,0.08)",
          color: "#0e9494",
          border: "1px solid rgba(19,194,194,0.18)",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function EntityPill({ value }: { value: string }) {
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-xs"
      style={{
        fontWeight: 500,
        backgroundColor: "rgba(19,194,194,0.06)",
        color: "#0e9494",
        border: "1px solid rgba(19,194,194,0.15)",
        fontFamily: "monospace",
        letterSpacing: "-0.01em",
      }}
    >
      {value}
    </span>
  );
}
// ─── Main List Page ───────────────────────────────────────────────────────────
export default function FeatureGroupList() {
  const navigate = useNavigate();

  // Core list state (lifted so modal can mutate it)
  const [fgList, setFgList] = useState<FeatureGroup[]>(INITIAL_MOCK);
  // Module dir state (lifted so modal can read it)
  const [modules, setModules] = useState<string[]>(INITIAL_MODULES);

  // UI state
  const [search, setSearch] = useState("");
  const [offlineTableSearch, setOfflineTableSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;
  const [showModuleDir, setShowModuleDir] = useState(false);
  const moduleDirWrapRef = useRef<HTMLDivElement>(null);

  // Modal state
  const [modalOpen, setModalOpen]       = useState(false);
  const [modalMode, setModalMode]       = useState<"create" | "edit">("create");
  const [modalEditId, setModalEditId]   = useState<string | undefined>();
  const [modalInitData, setModalInitData] = useState<Partial<FGFormData> | undefined>();
  const [modalInitStep, setModalInitStep] = useState(0);
  const [modalOrigStatus, setModalOrigStatus] = useState<string | undefined>();

  function openCreateModal() {
    setModalMode("create");
    setModalEditId(undefined);
    setModalInitData(undefined);
    setModalInitStep(0);
    setModalOrigStatus(undefined);
    setModalOpen(true);
  }

  function openEditModal(fg: FeatureGroup) {
    setModalMode("edit");
    setModalEditId(fg.id);
    setModalInitData(fg._formData ?? {});
    setModalInitStep(fg.status === "Draft" ? (fg._savedStep ?? 0) : 0);
    setModalOrigStatus(fg.status);
    setModalOpen(true);
  }

  function openCopyModal(fg: FeatureGroup) {
    // Create mode, but pre-fill with the source FG's latest config.
    // Clear the name so the user must give it a new one.
    const prefill = { ...(fg._formData ?? {}), name: "" };
    setModalMode("create");
    setModalEditId(undefined);
    setModalInitData(prefill);
    setModalInitStep(0);
    setModalOrigStatus(undefined);
    setModalOpen(true);
  }

  function setFgStatus(id: string, status: FeatureGroupStatus) {
    setFgList(list => list.map(fg => fg.id === id ? { ...fg, status } : fg));
  }

  function handleSaveDraft(data: FGFormData, editId?: string) {
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    if (editId) {
      setFgList(list =>
        list.map(fg =>
          fg.id === editId
            ? {
                ...fg,
                name: data.name || fg.name,
                region: data.region || fg.region,
                module: data.module || fg.module,
                owner: data.owners.join(",") || fg.owner,
                description: data.description,
                updateTime: now,
                status: "Draft" as FeatureGroupStatus,
                _formData: data,
              }
            : fg
        )
      );
    } else {
      const newFg: FeatureGroup = {
        id: `draft_${Date.now()}`,
        name: data.name || "(Untitled Draft)",
        status: "Draft",
        region: data.region || "—",
        module: data.module || "—",
        owner: data.owners.join(",") || "—",
        createTime: now,
        updateTime: now,
        description: data.description || "",
        _formData: data,
        _savedStep: 0,
      };
      setFgList(list => [newFg, ...list]);
    }
  }

  function handleSubmit(data: FGFormData, editId?: string) {
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    if (editId) {
      setFgList(list =>
        list.map(fg =>
          fg.id === editId
            ? {
                ...fg,
                name: data.name,
                region: data.region,
                module: data.module,
                owner: data.owners.join(","),
                description: data.description,
                updateTime: now,
                status: "Online Changing" as FeatureGroupStatus,
                _formData: data,       // keep for future re-edits
                _savedStep: undefined,
              }
            : fg
        )
      );
    } else {
      const newFg: FeatureGroup = {
        id: `fg_${Date.now()}`,
        name: data.name,
        status: "Online Changing",
        region: data.region,
        module: data.module,
        owner: data.owners.join(","),
        createTime: now,
        updateTime: now,
        description: data.description || "",
        _formData: data,
      };
      setFgList(list => [newFg, ...list]);
    }
  }

  function deleteFg(id: string) {
    setFgList(list => list.filter(fg => fg.id !== id));
  }

  function downloadHTML() {
    const blob = new Blob([FEATURE_GROUP_HTML], { type: "text/html;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "feature-group-list.html";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const filtered = fgList.filter(
    (fg) =>
      fg.name.toLowerCase().includes(search.toLowerCase()) ||
      fg.owner.toLowerCase().includes(search.toLowerCase()) ||
      fg.region.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Toolbar */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-1 h-5 rounded-full" style={{ backgroundColor: "#13c2c2" }} />
            <span className="text-gray-800" style={{ fontWeight: 600, fontSize: 16 }}>
              Feature Groups
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
              {filtered.length} items
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search feature groups..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:border-[#13c2c2] w-52 transition-colors"
              />
            </div>

            <div className="w-px h-5 bg-gray-200 mx-1" />

            {/* Add Feature Group */}
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded border border-transparent text-white transition-all hover:opacity-90 active:opacity-80"
              style={{ backgroundColor: "#13c2c2", fontWeight: 500 }}
            >
              <Plus size={13} />
              Add Feature Group
            </button>

            {/* Module Dir */}
            <div ref={moduleDirWrapRef} className="relative">
              <button
                onClick={() => setShowModuleDir((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded border bg-white transition-all ${
                  showModuleDir
                    ? "border-[#13c2c2] text-[#13c2c2]"
                    : "border-gray-300 text-gray-700 hover:border-[#13c2c2] hover:text-[#13c2c2]"
                }`}
                style={{ fontWeight: 500 }}
              >
                <FolderOpen size={13} />
                Module Dir
              </button>

              {showModuleDir && (
                <ModuleDirPopover
                  onClose={() => setShowModuleDir(false)}
                  modules={modules}
                  setModules={setModules}
                  fgList={fgList}
                />
              )}
            </div>

            <div className="w-px h-5 bg-gray-200 mx-1" />

            <button
              className="p-1.5 rounded border border-transparent text-gray-400 hover:border-gray-300 hover:text-gray-600 hover:bg-gray-50 transition-all"
              title="Refresh"
            >
              <RefreshCw size={14} />
            </button>
            <button
              className="p-1.5 rounded border border-transparent text-gray-400 hover:border-gray-300 hover:text-gray-600 hover:bg-gray-50 transition-all"
              title="Settings"
            >
              <Settings size={14} />
            </button>
            <button
              onClick={downloadHTML}
              title="下载为 HTML 文件"
              className="p-1.5 rounded border border-transparent text-gray-400 hover:border-gray-300 hover:text-gray-600 hover:bg-gray-50 transition-all inline-flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" x2="12" y1="15" y2="3"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Card list */}
      <div className="px-6 py-5 space-y-4">
        {paged.map((fg, idx) => (
          <FeatureGroupCard
            key={fg.id}
            fg={fg}
            index={(currentPage - 1) * pageSize + idx}
            onNavigate={fg.status === "Draft" ? undefined : () => navigate(`/detail/${fg.id}`)}
            onEdit={() => openEditModal(fg)}
            onCopy={() => openCopyModal(fg)}
            onDelete={() => deleteFg(fg.id)}
            onManageAction={(action) => {
              if (action === "delete")  deleteFg(fg.id);
              else if (action === "online")  setFgStatus(fg.id, "Online");
              else if (action === "revoke")  setFgStatus(fg.id, "Online");
              else if (action === "disable") setFgStatus(fg.id, "Offline");
            }}
          />
        ))}
        {paged.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <Search size={40} className="mx-auto mb-3 opacity-30" />
            <p>No feature groups found</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {filtered.length > 0 && (
        <div className="px-6 pb-8 flex items-center justify-between text-sm text-gray-500">
          <span>
            {(currentPage - 1) * pageSize + 1}–
            {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} items
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="px-2.5 py-1 rounded border border-gray-300 bg-white hover:border-[#13c2c2] hover:text-[#13c2c2] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              «
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setCurrentPage(p)}
                className="w-8 h-8 rounded border transition-colors text-sm"
                style={
                  p === currentPage
                    ? { backgroundColor: "#13c2c2", color: "#fff", borderColor: "#13c2c2", fontWeight: 600 }
                    : { borderColor: "#d1d5db", color: "#6b7280", background: "#fff" }
                }
              >
                {p}
              </button>
            ))}
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="px-2.5 py-1 rounded border border-gray-300 bg-white hover:border-[#13c2c2] hover:text-[#13c2c2] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              »
            </button>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      <FeatureGroupModal
        open={modalOpen}
        mode={modalMode}
        initialData={modalInitData}
        initialStep={modalInitStep}
        editId={modalEditId}
        modules={modules}
        originalStatus={modalOrigStatus}
        onClose={() => setModalOpen(false)}
        onSaveDraft={handleSaveDraft}
        onSubmit={handleSubmit}
      />
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

  const canOnline  = status === "Disable" || status === "Offline";
  const canRevoke  = status === "Online Changing";
  const canAccept  = status === "Online Changing";  // "Online" = accept the change
  const canDisable = status === "Online";
  const canDelete  = ["Draft", "Disable", "Offline"].includes(status);

  function toggle() { setOpen((v) => !v); setConfirmDisable(false); }

  function handleDisableConfirm() {
    onAction("disable");
    setOpen(false);
    setConfirmDisable(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggle}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg text-white transition-all hover:opacity-90"
        style={{ backgroundColor: "#13c2c2", fontWeight: 500 }}
      >
        Manage
        <ChevronDown size={11} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden"
          style={{ minWidth: 168 }}
        >
          {!confirmDisable ? (
            <div className="py-1">
              <MenuItem
                icon={<CheckCircle2 size={13} />}
                label="Online"
                enabled={canOnline || canAccept}
                iconColor="text-emerald-500"
                hoverColor="hover:bg-emerald-50 hover:text-emerald-700"
                onClick={() => { onAction("online"); setOpen(false); }}
              />
              <MenuItem
                icon={<RotateCcw size={13} />}
                label="Revoke"
                enabled={canRevoke}
                iconColor="text-amber-500"
                hoverColor="hover:bg-amber-50 hover:text-amber-600"
                onClick={() => { onAction("revoke"); setOpen(false); }}
              />
              <MenuItem
                icon={<Ban size={13} />}
                label="Offline"
                enabled={canDisable}
                iconColor="text-red-500"
                hoverColor="hover:bg-red-50 hover:text-red-600"
                onClick={() => setConfirmDisable(true)}
              />
              <div className="h-px bg-gray-100 my-1" />
              <MenuItem
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
            <div className="p-4" style={{ width: 220 }}>
              <div className="flex gap-2.5 mb-3.5">
                <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" style={{ color: "#fa8c16" }} />
                <p className="text-xs text-gray-700 leading-relaxed">
                  确认要将该 Feature Group 设为 <span style={{ fontWeight: 600 }}>Offline</span> 吗？此操作不可立即撤销。
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
                  onClick={handleDisableConfirm}
                  className="px-3 py-1 text-xs rounded text-white transition-all hover:opacity-90"
                  style={{ backgroundColor: "#ef4444", fontWeight: 500 }}
                >
                  确认 Offline
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Menu Item ────────────────────────────────────────────────────────────────
function MenuItem({
  icon, label, enabled, iconColor, hoverColor, danger = false, onClick,
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
        <span className="ml-auto text-gray-300" style={{ fontSize: 10 }}>N/A</span>
      )}
    </button>
  );
}

// ─── Feature Group Card ───────────────────────────────────────────────────────
function FeatureGroupCard({
  fg, index, onNavigate, onEdit, onCopy, onDelete, onManageAction,
}: {
  fg: FeatureGroup;
  index: number;
  onNavigate?: () => void;
  onEdit: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onManageAction: (action: ManageAction) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const isDraft = fg.status === "Draft";

  return (
    <div
      className="bg-white rounded-xl border transition-all duration-200"
      style={{
        borderColor: hovered ? (isDraft ? "#94a3b8" : "#13c2c2") : "#e5e7eb",
        boxShadow: hovered
          ? isDraft
            ? "0 4px 16px 0 rgba(100,116,139,0.12), 0 1px 4px 0 rgba(0,0,0,0.04)"
            : "0 4px 24px 0 rgba(19,194,194,0.10), 0 1px 4px 0 rgba(0,0,0,0.04)"
          : "0 1px 4px 0 rgba(0,0,0,0.04)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex">
        {/* Left accent bar */}
        <div
          className="w-1.5 flex-shrink-0 rounded-l-xl transition-all duration-200"
          style={{
            backgroundColor: isDraft
              ? (hovered ? "#94a3b8" : "#e2e8f0")
              : (hovered ? "#13c2c2" : "#e0f7f7"),
          }}
        />
        <div className="flex-1 px-6 py-5">
          {/* Top row */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap min-w-0">
              {/* FG Name */}
              {isDraft ? (
                <span
                  className="flex items-center gap-1.5 min-w-0"
                  title="Draft — not published. Click Edit to continue."
                >
                  <span
                    className="text-gray-400"
                    style={{
                      fontWeight: 700,
                      fontSize: 17,
                      fontFamily: "monospace",
                      letterSpacing: "-0.01em",
                      cursor: "default",
                    }}
                  >
                    {fg.name}
                  </span>
                </span>
              ) : (
                <button onClick={onNavigate} className="text-left group flex items-center gap-1.5 min-w-0">
                  <span
                    className="transition-colors group-hover:underline"
                    style={{
                      fontWeight: 700,
                      fontSize: 17,
                      color: hovered ? "#13c2c2" : "#1a1a2e",
                      fontFamily: "monospace",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {fg.name}
                  </span>
                  <ChevronRight
                    size={15}
                    className="flex-shrink-0 transition-all opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5"
                    style={{ color: "#13c2c2" }}
                  />
                </button>
              )}
              <StatusTag status={fg.status} />
              {MOCK_FT_COUNTS[fg.id] && (
                <>
                  <FtsTag type="training" count={MOCK_FT_COUNTS[fg.id].train} />
                  <FtsTag type="serving"  count={MOCK_FT_COUNTS[fg.id].serve} />
                </>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={fg.status === "Online Changing" || fg.status === "Disable" ? undefined : onEdit}
                disabled={fg.status === "Online Changing" || fg.status === "Disable"}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-all ${
                  isDraft
                    ? "border-teal-400 text-teal-600 bg-teal-50 hover:bg-teal-100"
                    : fg.status === "Online Changing" || fg.status === "Disable"
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
                <Edit2 size={12} />
                Edit
              </button>

              {/* Copy button */}
              <button
                onClick={onCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:border-teal-300 hover:text-teal-600 hover:bg-teal-50 transition-all"
                style={{ fontWeight: 500 }}
                title="Copy this feature group's config into a new one"
              >
                <Copy size={12} />
                Copy
              </button>

              <ManageDropdown
                status={fg.status}
                onAction={onManageAction}
              />
            </div>
          </div>

          {/* Description */}
          <p className="mt-2.5 text-sm text-gray-500 leading-relaxed line-clamp-2">
            {fg.description || <span className="italic text-gray-300">No description</span>}
          </p>

          {/* Meta — single flex-wrap row, overflows to next line naturally */}
          <div className="mt-4 pt-3.5 border-t border-gray-100">
            <div className="flex items-center flex-wrap gap-x-5 gap-y-2">
              <MetaItem icon={<MapPin size={13} />} label="Region"  value={fg.region} />
              <MetaItem icon={<Layers size={13} />} label="Module"  value={fg.module} />
              <div className="flex items-center gap-1.5">
                <span className="flex-shrink-0 text-gray-400"><User size={13} /></span>
                <span className="flex-shrink-0 text-gray-400 text-xs">Owner:</span>
                <div className="flex flex-wrap gap-1">
                  {fg.owner.split(",").map(o => (
                    <span
                      key={o}
                      className="inline-flex items-center px-2 py-0.5 rounded-md text-xs"
                      style={{
                        fontWeight: 600,
                        backgroundColor: "rgba(19,194,194,0.08)",
                        color: "#0e9494",
                        border: "1px solid rgba(19,194,194,0.18)",
                      }}
                    >
                      {o.trim()}
                    </span>
                  ))}
                </div>
              </div>
              <MetaItem icon={<Clock size={13} />} label="Updated" value={fg.updateTime} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Module Dir Popover ───────────────────────────────────────────────────────
function ModuleDirPopover({
  onClose, modules, setModules, fgList,
}: {
  onClose: () => void;
  modules: string[];
  setModules: React.Dispatch<React.SetStateAction<string[]>>;
  fgList: FeatureGroup[];
}) {
  const [deleteError, setDeleteError] = useState<{ module: string; fgs: string[] } | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [newInput, setNewInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (addingNew && inputRef.current) inputRef.current.focus();
  }, [addingNew]);

  useEffect(() => { setDeleteError(null); }, [modules]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  function getOnlineFGsForModule(moduleName: string): string[] {
    return fgList
      .filter(fg => fg.module === moduleName && fg.status === "Online")
      .map(fg => fg.name);
  }

  function handleDelete(mod: string) {
    const blocked = getOnlineFGsForModule(mod);
    if (blocked.length > 0) {
      setDeleteError({ module: mod, fgs: blocked });
      return;
    }
    setModules((prev) => prev.filter((m) => m !== mod));
  }

  function commitNew() {
    const name = newInput.trim();
    if (name && !modules.includes(name)) {
      setModules((prev) => [...prev, name]);
    }
    setNewInput("");
    setAddingNew(false);
  }

  function handleNewKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") commitNew();
    if (e.key === "Escape") { setNewInput(""); setAddingNew(false); }
  }

  return (
    <div
      ref={popoverRef}
      className="absolute right-0 top-full z-50 flex flex-col bg-white rounded-xl border border-gray-200"
      style={{
        marginTop: 8,
        width: 420,
        maxHeight: 480,
        boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
      }}
    >
      {/* Caret */}
      <div
        className="absolute bg-white border-l border-t border-gray-200"
        style={{ width: 10, height: 10, top: -6, right: 18, transform: "rotate(45deg)" }}
      />

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="w-1 h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: "#13c2c2" }} />
          <span style={{ fontWeight: 700, fontSize: 13, color: "#1a1a2e" }}>Module Directory</span>
          <span
            className="px-1.5 py-0.5 rounded-full text-xs"
            style={{ background: "#f3f4f6", color: "#6b7280", fontWeight: 500 }}
          >
            {modules.length}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-0.5 rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
        >
          <X size={13} />
        </button>
      </div>

      {/* Tags area */}
      <div className="overflow-y-auto px-4 py-3.5" style={{ flex: 1 }}>
        <div className="flex flex-wrap gap-1.5">
          {modules.map((mod) => {
            const isErrored = deleteError?.module === mod;
            return (
              <span
                key={mod}
                className="inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-md border text-xs transition-all"
                style={{
                  borderColor: isErrored ? "#fca5a5" : "#e5e7eb",
                  background: isErrored ? "#fff1f1" : "#fafafa",
                  color: isErrored ? "#dc2626" : "#374151",
                  fontWeight: 500,
                }}
              >
                {mod}
                <button
                  onClick={() => handleDelete(mod)}
                  className="inline-flex items-center justify-center w-3.5 h-3.5 rounded hover:bg-gray-200 transition-colors flex-shrink-0 ml-0.5"
                  style={{ color: isErrored ? "#dc2626" : "#9ca3af" }}
                >
                  <X size={9} />
                </button>
              </span>
            );
          })}

          {addingNew ? (
            <span
              className="inline-flex items-center pl-2 pr-1 py-0.5 rounded-md border border-dashed text-xs"
              style={{ borderColor: "#13c2c2", background: "#f0fdfa", minWidth: 110 }}
            >
              <input
                ref={inputRef}
                value={newInput}
                onChange={(e) => setNewInput(e.target.value)}
                onKeyDown={handleNewKeyDown}
                onBlur={commitNew}
                placeholder="Module name…"
                className="bg-transparent focus:outline-none text-xs"
                style={{ color: "#0e9494", width: 100, fontWeight: 500 }}
              />
            </span>
          ) : (
            <button
              onClick={() => setAddingNew(true)}
              className="inline-flex items-center gap-1 pl-2 pr-2.5 py-0.5 rounded-md border border-dashed text-xs transition-colors hover:border-[#13c2c2] hover:text-[#13c2c2] hover:bg-teal-50"
              style={{ borderColor: "#d1d5db", color: "#6b7280", fontWeight: 500 }}
            >
              <FilePlus size={11} />
              New Directory
            </button>
          )}
        </div>

        {deleteError && (
          <div
            className="mt-3 flex items-start gap-2 px-3 py-2.5 rounded-lg border"
            style={{ background: "#fff8f8", borderColor: "#fca5a5" }}
          >
            <AlertCircle size={12} className="flex-shrink-0 mt-px" style={{ color: "#dc2626" }} />
            <p className="text-xs leading-relaxed" style={{ color: "#b91c1c" }}>
              已有 Online 状态的{" "}
              {deleteError.fgs.map((name, i) => (
                <span key={name}>
                  <span
                    className="px-1 py-0.5 rounded"
                    style={{ background: "rgba(220,38,38,0.08)", fontWeight: 700, fontFamily: "monospace" }}
                  >
                    {name}
                  </span>
                  {i < deleteError.fgs.length - 1 && (
                    <span className="mx-0.5">
                      {i === deleteError.fgs.length - 2 ? " 和 " : "、"}
                    </span>
                  )}
                </span>
              ))}{" "}
              关联到此 Module，无法删除。
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-end px-4 py-3 border-t border-gray-100">
        <button
          onClick={onClose}
          className="px-4 py-1 text-xs rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
          style={{ fontWeight: 500 }}
        >
          Close
        </button>
      </div>
    </div>
  );
}