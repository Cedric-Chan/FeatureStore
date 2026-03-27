import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { useFeatureGroups } from "@/app/feature-group/FeatureGroupsProvider";
import { FEATURE_GROUP_HTML } from "./featureGroupHtml";
import FeatureGroupModal, {
  type FGFormData,
  normalizeFgFormData,
} from "./FeatureGroupModal";
import type { FeatureGroup, FeatureGroupStatus } from "./fgSeed";

export type { FeatureGroup, FeatureGroupStatus } from "./fgSeed";
export { INITIAL_FG_LIST_SEED, INITIAL_MODULES } from "./fgSeed";
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
  Search,
  X,
  FilePlus,
  AlertCircle,
  Database,
  Zap,
  Copy,
} from "lucide-react";
import { FgManageDropdown } from "./FgManageDropdown";
import {
  FgConfigDiffModal,
  MOCK_FG_DIFF_NEW,
  MOCK_FG_DIFF_OLD,
} from "./FgConfigDiffModal";

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
  const { fgList, setFgList, updateFg, syncFgMetadata, modules, setModules } =
    useFeatureGroups();

  const SYNC_ARIA =
    "Manually refresh latest Training Config metadata";

  // UI state
  const [search, setSearch] = useState("");
  const [offlineTableSearch, setOfflineTableSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;
  const [showModuleDir, setShowModuleDir] = useState(false);
  const moduleDirWrapRef = useRef<HTMLDivElement>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalInitData, setModalInitData] = useState<
    Partial<FGFormData> | undefined
  >();
  const [configDiffFgId, setConfigDiffFgId] = useState<string | null>(null);

  function openCreateModal() {
    setModalInitData(undefined);
    setModalOpen(true);
  }

  function openCopyModal(fg: FeatureGroup) {
    const prefill = { ...(fg._formData ?? {}), name: "" };
    setModalInitData(prefill);
    setModalOpen(true);
  }

  function handleBasicModalSubmit(data: FGFormData) {
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    const full = normalizeFgFormData(
      data as Partial<FGFormData> & Record<string, unknown>
    );
    const newId = `draft_${Date.now()}`;
    const newFg: FeatureGroup = {
      id: newId,
      name: full.name || "(Untitled Draft)",
      status: "Draft",
      region: full.region || "—",
      module: full.module || "—",
      owner: full.owners.join(",") || "—",
      createTime: now,
      updateTime: now,
      description: full.description || "",
      _formData: full,
    };
    setFgList((list) => [newFg, ...list]);
    setModalOpen(false);
    navigate(`/fg/${newId}`);
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
      !fg.deleted &&
      (fg.name.toLowerCase().includes(search.toLowerCase()) ||
        fg.owner.toLowerCase().includes(search.toLowerCase()) ||
        fg.region.toLowerCase().includes(search.toLowerCase()))
  );

  const diffFg =
    configDiffFgId != null
      ? fgList.find((f) => f.id === configDiffFgId)
      : undefined;

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Toolbar */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#13c2c2] flex items-center justify-center shadow-sm">
                <Layers size={14} className="text-white" />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1
                  className="text-gray-800 leading-tight"
                  style={{ fontSize: "15px", fontWeight: 600 }}
                >
                  Feature Groups
                </h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                  {filtered.length} items
                </span>
              </div>
            </div>
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
            onNavigate={() => navigate(`/fg/${fg.id}`)}
            onSync={() => void syncFgMetadata(fg.id)}
            syncTitle={SYNC_ARIA}
            onCopy={() => openCopyModal(fg)}
            onOnlineIntent={() => {
              if (fg.status === "Online Changing") setConfigDiffFgId(fg.id);
              else updateFg(fg.id, { status: "Online" });
            }}
            onDraftConfirm={() => updateFg(fg.id, { status: "Draft" })}
            onDeleteConfirm={() => updateFg(fg.id, { deleted: true })}
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
        mode="create"
        variant="basic"
        initialData={modalInitData}
        modules={modules}
        onClose={() => setModalOpen(false)}
        onSubmit={(data) => handleBasicModalSubmit(data)}
      />

      <FgConfigDiffModal
        open={configDiffFgId != null && !!diffFg}
        onClose={() => setConfigDiffFgId(null)}
        oldText={MOCK_FG_DIFF_OLD}
        newText={MOCK_FG_DIFF_NEW}
        onConfirm={() => {
          if (configDiffFgId) updateFg(configDiffFgId, { status: "Online" });
        }}
      />
    </div>
  );
}

// ─── Feature Group Card ───────────────────────────────────────────────────────
function FeatureGroupCard({
  fg,
  index,
  onNavigate,
  onSync,
  syncTitle,
  onCopy,
  onOnlineIntent,
  onDraftConfirm,
  onDeleteConfirm,
}: {
  fg: FeatureGroup;
  index: number;
  onNavigate: () => void;
  onSync: () => void;
  syncTitle: string;
  onCopy: () => void;
  onOnlineIntent: () => void;
  onDraftConfirm: () => void;
  onDeleteConfirm: () => void;
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
              <button
                type="button"
                onClick={onNavigate}
                className="text-left group flex items-center gap-1.5 min-w-0"
                title={
                  isDraft
                    ? "Open draft detail"
                    : "Open feature group detail"
                }
              >
                <span
                  className="transition-colors group-hover:underline"
                  style={{
                    fontWeight: 700,
                    fontSize: 17,
                    color: isDraft
                      ? "#64748b"
                      : hovered
                      ? "#13c2c2"
                      : "#1a1a2e",
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
                type="button"
                onClick={
                  fg.status === "Online Changing" ? undefined : onSync
                }
                disabled={fg.status === "Online Changing"}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-all min-h-[44px] ${
                  fg.status === "Online Changing"
                    ? "border-gray-100 text-gray-300 bg-gray-50 cursor-not-allowed"
                    : "border-gray-200 text-gray-600 hover:border-teal-300 hover:text-teal-600 hover:bg-teal-50"
                }`}
                style={{ fontWeight: 500 }}
                title={
                  fg.status === "Online Changing"
                    ? "Cannot sync while a change is pending"
                    : syncTitle
                }
                aria-label={syncTitle}
              >
                <RefreshCw size={12} />
                Sync
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

              <FgManageDropdown
                compact
                status={fg.status}
                onOnlineIntent={onOnlineIntent}
                onDraftConfirm={onDraftConfirm}
                onDeleteConfirm={onDeleteConfirm}
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