import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  Check,
  Database,
  Download,
  Maximize2,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import type { DataCleaningSnapshot, DataIngestionConfigSnapshot } from "@/data/widetableCanvasModel";
import { getCleaningFeatureNameOptions } from "@/data/featureGroupCatalog";
import type { Instance, WideTableRow } from "@/app/components/WideTableList";
import {
  DataReportTableSection,
  downloadDataReportCsv,
  generateReportRows,
  parseColumnCount,
} from "@/app/components/DataReportModal";

const FILLNA_METHODS = ["mean", "median", "constant", "forward_fill"] as const;

function parseFeaturesCsv(csv: string): string[] {
  return csv.split(",").map((s) => s.trim()).filter(Boolean);
}

function joinFeaturesCsv(names: string[]): string {
  return names.join(", ");
}

function FillnaFeatureNamesMultiSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (csv: string) => void;
}) {
  const selectedSet = useMemo(() => new Set(parseFeaturesCsv(value)), [value]);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const filtered = useMemo(
    () => options.filter((o) => o.toLowerCase().includes(q.trim().toLowerCase())),
    [options, q]
  );

  const toggle = (name: string) => {
    const next = new Set(selectedSet);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    const sorted = [...next].sort((a, b) => a.localeCompare(b));
    onChange(joinFeaturesCsv(sorted));
  };

  const summary =
    selectedSet.size === 0
      ? "Select features…"
      : selectedSet.size <= 2
        ? joinFeaturesCsv([...selectedSet].sort((a, b) => a.localeCompare(b)))
        : `${selectedSet.size} features selected`;

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 text-left text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50 focus:outline-none focus:border-teal-400"
      >
        <span className={`truncate min-w-0 ${selectedSet.size ? "text-gray-800 font-mono" : "text-gray-400"}`}>
          {summary}
        </span>
        <ChevronDown size={14} className="shrink-0 text-gray-400" />
      </button>
      {open && (
        <div className="absolute left-0 right-0 z-50 mt-1 rounded-xl border border-gray-200 bg-white shadow-lg flex flex-col max-h-56 overflow-hidden">
          <div className="p-2 border-b border-gray-100 shrink-0">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search features…"
              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50 focus:outline-none focus:border-teal-400"
            />
          </div>
          <div className="overflow-y-auto py-1">
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-xs text-gray-400 text-center">No matches</div>
            )}
            {filtered.map((name) => {
              const on = selectedSet.has(name);
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => toggle(name)}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left hover:bg-teal-50/80 transition-colors"
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      on ? "border-teal-500 bg-teal-500 text-white" : "border-gray-300 bg-white"
                    }`}
                  >
                    {on ? <Check size={10} strokeWidth={3} /> : null}
                  </span>
                  <span className="text-xs font-mono text-gray-700 truncate">{name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function latestSuccessfulInstanceColumnsCnt(instances: Instance[]): string | undefined {
  const success = [...instances].filter((i) => i.status === "SUCCESS");
  if (success.length === 0) return undefined;
  success.sort((a, b) => b.finishTime.localeCompare(a.finishTime));
  return success[0].columnsCnt;
}

export function DataCleaningAndReportsModal({
  row,
  initialCleaning,
  ingestionConfig,
  onClose,
  onSave,
}: {
  row: WideTableRow;
  initialCleaning: DataCleaningSnapshot;
  ingestionConfig?: DataIngestionConfigSnapshot;
  onClose: () => void;
  onSave: (next: DataCleaningSnapshot) => void;
}) {
  const cleaningFeatureOptions = useMemo(() => getCleaningFeatureNameOptions(), []);
  const [reportTab, setReportTab] = useState<"raw" | "clean">("raw");
  const [enabled, setEnabled] = useState(() => initialCleaning.enabled);
  const [fillnaRows, setFillnaRows] = useState<{ id: string; method: string; features: string }[]>(() =>
    initialCleaning.fillnaRows?.length ? initialCleaning.fillnaRows.map((r) => ({ ...r })) : []
  );
  const [vmRows, setVmRows] = useState<{ id: string; feature: string; sql: string }[]>(() =>
    initialCleaning.vmRows?.length ? initialCleaning.vmRows.map((r) => ({ ...r })) : []
  );
  const [vmFullscreen, setVmFullscreen] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled && reportTab === "clean") setReportTab("raw");
  }, [enabled, reportTab]);

  useEffect(() => {
    if (!vmFullscreen) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") setVmFullscreen(null);
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [vmFullscreen]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const rawColCount = parseColumnCount(latestSuccessfulInstanceColumnsCnt(row.instances));
  const cleanColCount = Math.max(1, rawColCount - 4);
  const reportColumnCount = reportTab === "raw" ? rawColCount : cleanColCount;

  const rawTable = ingestionConfig?.rawTable ?? "feature_store.dwd_wide_raw_feat_v1";
  const rawS3 = ingestionConfig?.rawS3 ?? "s3://data-lake-prod/widetable/reports/ts_demo/20240315/raw_stats.json";
  const cleanedTable =
    ingestionConfig?.cleanedTable ?? "feature_store.dwd_wide_clean_feat_v1";
  const cleanedReportPath =
    ingestionConfig?.cleanedReportPath ??
    "s3://data-lake-prod/widetable/reports/ts_demo/20240315/clean_stats.json";

  const addFillna = () =>
    setFillnaRows((p) => [...p, { id: `fn-${Date.now()}`, method: "mean", features: "" }]);
  const addVm = () =>
    setVmRows((p) => [...p, { id: `vm-${Date.now()}`, feature: "", sql: "" }]);

  const handleSave = () => {
    onSave({
      enabled,
      fillnaRows: fillnaRows.map((r) => ({ ...r })),
      vmRows: vmRows.map((r) => ({ ...r })),
    });
    onClose();
  };

  const handleDownloadReport = () => {
    const rows = generateReportRows(reportColumnCount);
    downloadDataReportCsv(rows, `data-report-${reportTab}-${row.name}-${reportColumnCount}cols.csv`);
  };

  return (
    <>
      <div className="fixed inset-0 z-[125] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
        <div
          className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between gap-3 bg-gradient-to-r from-teal-50/80 via-violet-50/30 to-white">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-teal-100 flex items-center justify-center shrink-0">
                <Sparkles size={16} className="text-teal-600" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-800 truncate">Data cleaning · {row.name}</div>
                <div className="text-[11px] text-gray-400 mt-0.5 leading-snug">
                  Raw table → Raw report → Data cleaning → Cleaned report
                </div>
                <div className="text-[10px] text-gray-400 mt-1 font-mono truncate" title={rawTable}>
                  Raw: {rawTable}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleDownloadReport}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:border-teal-300 hover:text-teal-700 hover:bg-teal-50/50 transition-all"
              >
                <Download size={13} /> Download CSV
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="px-5 py-4 border-b border-gray-100 bg-slate-50/40">
              <div className="flex items-center gap-2 mb-3">
                <Database size={14} className="text-teal-600 shrink-0" />
                <span className="text-xs font-medium text-gray-600 tracking-wide uppercase">Data report</span>
              </div>
              <div className="flex flex-wrap gap-1 border-b border-gray-200 pb-2 mb-3">
                <button
                  type="button"
                  onClick={() => setReportTab("raw")}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    reportTab === "raw"
                      ? "border-teal-400 bg-teal-50 text-teal-800"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Raw Data Report
                </button>
                <button
                  type="button"
                  disabled={!enabled}
                  onClick={() => setReportTab("clean")}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    reportTab === "clean"
                      ? "border-violet-400 bg-violet-50 text-violet-800"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  } ${!enabled ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  Cleaned Data Report
                </button>
              </div>
              {!enabled && (
                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-3">
                  Enable data cleaning below to view the cleaned data report (post-processing after raw wide
                  table writes).
                </p>
              )}
              <div className="rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col max-h-[320px]">
                <DataReportTableSection
                  key={`${reportTab}-${reportColumnCount}`}
                  columnCount={reportColumnCount}
                  pageSize={12}
                  tableClassName="max-h-[200px]"
                />
              </div>
              <div className="mt-2 text-[10px] text-gray-400 space-y-0.5 font-mono break-all">
                <div>Raw report path: {rawS3}</div>
                {enabled && <div>Cleaned report path: {cleanedReportPath}</div>}
              </div>
            </div>

            <div className="px-5 py-4">
              <div className="text-xs font-medium text-gray-500 tracking-wide uppercase mb-3">Data cleaning</div>
              <div className="flex items-center justify-between rounded-xl border border-gray-200 px-3 py-2.5 bg-gray-50/80 mb-4">
                <span className="text-sm text-gray-700">Enable data cleaning</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  onClick={() => setEnabled((e) => !e)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? "bg-teal-500" : "bg-gray-200"}`}
                >
                  <span
                    className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-5" : ""}`}
                  />
                </button>
              </div>

              {enabled && (
                <>
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-500 tracking-wide">Fillna</span>
                      <button
                        type="button"
                        onClick={addFillna}
                        className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                      >
                        + Add row
                      </button>
                    </div>
                    <div className="flex flex-col gap-2">
                      {fillnaRows.map((rrow, idx) => (
                        <div key={rrow.id} className="rounded-xl border border-gray-200 p-3 space-y-2 bg-white">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">#{idx + 1}</span>
                            <button
                              type="button"
                              onClick={() => setFillnaRows((p) => p.filter((r) => r.id !== rrow.id))}
                              className="text-gray-300 hover:text-red-400"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                          <select
                            value={rrow.method}
                            onChange={(e) =>
                              setFillnaRows((p) =>
                                p.map((r) => (r.id === rrow.id ? { ...r, method: e.target.value } : r))
                              )
                            }
                            className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50 focus:outline-none focus:border-teal-400"
                          >
                            {FILLNA_METHODS.map((m) => (
                              <option key={m} value={m}>
                                {m}
                              </option>
                            ))}
                          </select>
                          <div>
                            <div className="text-[10px] text-gray-400 mb-1">Feature names</div>
                            <FillnaFeatureNamesMultiSelect
                              value={rrow.features}
                              options={cleaningFeatureOptions}
                              onChange={(csv) =>
                                setFillnaRows((p) =>
                                  p.map((r) => (r.id === rrow.id ? { ...r, features: csv } : r))
                                )
                              }
                            />
                          </div>
                        </div>
                      ))}
                      {fillnaRows.length === 0 && (
                        <p className="text-xs text-gray-400 border border-dashed border-gray-200 rounded-xl py-4 text-center">
                          No Fillna rules — optional
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-500 tracking-wide">Value mapping</span>
                      <button
                        type="button"
                        onClick={addVm}
                        className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                      >
                        + Add row
                      </button>
                    </div>
                    <div className="flex flex-col gap-2">
                      {vmRows.map((rrow, idx) => (
                        <div key={rrow.id} className="rounded-xl border border-gray-200 p-3 space-y-2 bg-white">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">#{idx + 1}</span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                title="Expand SQL"
                                onClick={() => setVmFullscreen(rrow.id)}
                                className="p-1 rounded-lg text-gray-400 hover:text-teal-600 hover:bg-teal-50"
                              >
                                <Maximize2 size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setVmRows((p) => p.filter((r) => r.id !== rrow.id))}
                                className="text-gray-300 hover:text-red-400"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] text-gray-400 mb-1">Feature name</div>
                            <select
                              value={rrow.feature}
                              onChange={(e) =>
                                setVmRows((p) =>
                                  p.map((r) => (r.id === rrow.id ? { ...r, feature: e.target.value } : r))
                                )
                              }
                              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 font-mono bg-gray-50 focus:outline-none focus:border-teal-400"
                            >
                              <option value="">Select feature…</option>
                              {rrow.feature.trim() && !cleaningFeatureOptions.includes(rrow.feature) ? (
                                <option value={rrow.feature}>{rrow.feature}</option>
                              ) : null}
                              {cleaningFeatureOptions.map((name) => (
                                <option key={name} value={name}>
                                  {name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <textarea
                            value={rrow.sql}
                            onChange={(e) =>
                              setVmRows((p) =>
                                p.map((r) => (r.id === rrow.id ? { ...r, sql: e.target.value } : r))
                              )
                            }
                            rows={3}
                            placeholder="SQL / CASE WHEN …"
                            className="w-full text-xs font-mono border border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50 resize-y focus:outline-none focus:border-teal-400"
                          />
                        </div>
                      ))}
                      {vmRows.length === 0 && (
                        <p className="text-xs text-gray-400 border border-dashed border-gray-200 rounded-xl py-4 text-center">
                          No value mappings — optional
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-violet-100 bg-violet-50/30 px-3 py-2 text-[11px] text-violet-900">
                    Cleaned wide table (reference):{" "}
                    <span className="font-mono text-violet-800">{cleanedTable}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2 bg-gray-50/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-xl border border-gray-200 text-gray-600 hover:bg-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 text-sm rounded-xl bg-teal-500 text-white hover:bg-teal-600 shadow-sm"
            >
              Save
            </button>
          </div>
        </div>
      </div>

      {vmFullscreen && (
        <div
          className="fixed inset-0 z-[135] flex items-center justify-center p-6 bg-black/50"
          onClick={() => setVmFullscreen(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl border border-gray-100 flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
              <span className="text-sm font-medium text-gray-800">SQL editor</span>
              <button
                type="button"
                onClick={() => setVmFullscreen(null)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            </div>
            <textarea
              value={vmRows.find((r) => r.id === vmFullscreen)?.sql ?? ""}
              onChange={(e) =>
                setVmRows((p) => p.map((r) => (r.id === vmFullscreen ? { ...r, sql: e.target.value } : r)))
              }
              className="flex-1 min-h-[240px] m-4 font-mono text-sm border border-gray-200 rounded-xl p-3 focus:outline-none focus:border-teal-400"
            />
            <div className="px-4 py-3 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setVmFullscreen(null)}
                className="px-4 py-2 text-sm bg-teal-500 text-white rounded-lg hover:bg-teal-600"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
