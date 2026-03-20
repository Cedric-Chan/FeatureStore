import { useMemo, useState } from "react";
import { Database, Download, Search, X } from "lucide-react";

export type ReportRow = {
  name: string;
  cnt: number;
  cntUniq: number;
  max: string;
  min: string;
  avg: string;
  zcnt: number;
  nullcnt: number;
  negcnt: number;
};

/** Parse "48", "1,234" or empty → positive integer, min 1 */
export function parseColumnCount(s: string | undefined): number {
  if (!s?.trim()) return 42;
  const n = parseInt(s.replace(/,/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : 42;
}

function hashSeed(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function generateReportRows(columnCount: number): ReportRow[] {
  const n = Math.max(1, Math.min(columnCount, 5000));
  return Array.from({ length: n }, (_, i) => {
    const name = `feature_${i + 1}`;
    const seed = hashSeed(name);
    const base = 2_500_000 + (seed % 400_000);
    return {
      name,
      cnt: base + i * 13,
      cntUniq: 10 + (seed % 2000),
      max: String(800 + (seed % 100)),
      min: String(seed % 50),
      avg: ((seed % 1000) / 10).toFixed(1),
      zcnt: seed % 50_000,
      nullcnt: seed % 2000,
      negcnt: seed % 100,
    };
  });
}

const TABLE_HEADERS = [
  "Column Name",
  "Cnt",
  "Cnt Uniq",
  "Max",
  "Min",
  "Avg",
  "0 cnt",
  "null cnt",
  "neg cnt",
] as const;

type TabKey = "raw" | "clean";

export function DataReportModal({
  onClose,
  variant,
  columnCount,
  rawColumnCount,
  cleanColumnCount,
  defaultTab = "raw",
  singleTitle = "Data Report",
}: {
  onClose: () => void;
  variant: "single" | "tabs";
  /** single mode: number of feature rows */
  columnCount?: number;
  /** tabs mode */
  rawColumnCount?: number;
  cleanColumnCount?: number;
  defaultTab?: TabKey;
  singleTitle?: string;
}) {
  const [tab, setTab] = useState<TabKey>(defaultTab);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const activeCount =
    variant === "single"
      ? Math.max(1, columnCount ?? 42)
      : tab === "raw"
        ? Math.max(1, rawColumnCount ?? 42)
        : Math.max(1, cleanColumnCount ?? 38);

  const allRows = useMemo(() => generateReportRows(activeCount), [activeCount]);

  const filtered = useMemo(
    () => allRows.filter((r) => r.name.toLowerCase().includes(q.trim().toLowerCase())),
    [allRows, q]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageSafe = Math.min(page, totalPages);
  const paged = useMemo(() => {
    const start = (pageSafe - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, pageSafe]);

  const downloadCsv = (rows: ReportRow[], fname: string) => {
    const head = TABLE_HEADERS.join(",");
    const lines = [head].concat(
      rows.map((r) =>
        [r.name, r.cnt, r.cntUniq, r.max, r.min, r.avg, r.zcnt, r.nullcnt, r.negcnt].join(",")
      )
    );
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fname;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleTab = (t: TabKey) => {
    setTab(t);
    setPage(1);
    setQ("");
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between gap-3 bg-gradient-to-r from-teal-50/80 to-white">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-teal-100 flex items-center justify-center shrink-0">
              <Database size={15} className="text-teal-600" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-800">
                {variant === "tabs" ? "Data Report" : singleTitle}
              </div>
              <div className="text-xs text-gray-400">
                {variant === "tabs"
                  ? `${activeCount} columns · ${tab === "raw" ? "Raw" : "Clean"} statistics`
                  : `${activeCount} columns · column-level statistics`}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() =>
                downloadCsv(
                  filtered,
                  variant === "tabs"
                    ? `data-report-${tab}-${activeCount}cols.csv`
                    : "data-quality-report.csv"
                )
              }
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

        {variant === "tabs" && (
          <div className="flex px-5 pt-3 gap-1 border-b border-gray-100">
            <button
              type="button"
              onClick={() => handleTab("raw")}
              className={`px-4 py-2 text-xs font-medium rounded-t-lg border-b-2 transition-colors ${
                tab === "raw"
                  ? "border-teal-500 text-teal-700 bg-teal-50/50"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Raw Data Report
            </button>
            <button
              type="button"
              onClick={() => handleTab("clean")}
              className={`px-4 py-2 text-xs font-medium rounded-t-lg border-b-2 transition-colors ${
                tab === "clean"
                  ? "border-violet-500 text-violet-700 bg-violet-50/40"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Clean Data Report
            </button>
          </div>
        )}

        <div className="px-5 py-3 border-b border-gray-50">
          <div className="relative max-w-sm">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search feature / column name…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-teal-400 focus:bg-white transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto min-h-[200px]">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-gray-50 border-b border-gray-100 z-[1]">
              <tr className="text-left text-gray-500">
                {TABLE_HEADERS.map((h) => (
                  <th key={h} className="px-3 py-2.5 font-medium whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.map((r) => (
                <tr key={r.name} className="border-b border-gray-50 hover:bg-teal-50/30">
                  <td className="px-3 py-2 font-mono text-gray-800">{r.name}</td>
                  <td className="px-3 py-2 tabular-nums text-gray-700">{r.cnt.toLocaleString()}</td>
                  <td className="px-3 py-2 tabular-nums text-gray-700">{r.cntUniq.toLocaleString()}</td>
                  <td className="px-3 py-2 font-mono text-gray-600">{r.max}</td>
                  <td className="px-3 py-2 font-mono text-gray-600">{r.min}</td>
                  <td className="px-3 py-2 font-mono text-gray-600">{r.avg}</td>
                  <td className="px-3 py-2 tabular-nums">{r.zcnt.toLocaleString()}</td>
                  <td className="px-3 py-2 tabular-nums">{r.nullcnt.toLocaleString()}</td>
                  <td className="px-3 py-2 tabular-nums">{r.negcnt.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-sm text-gray-400">No columns match your search.</div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-gray-50/60">
          <span className="text-xs text-gray-500">
            Showing {(pageSafe - 1) * pageSize + 1}–{Math.min(pageSafe * pageSize, filtered.length)} of{" "}
            {filtered.length} rows
            {q.trim() ? ` (filtered from ${allRows.length})` : ""}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pageSafe <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-xs text-gray-600 tabular-nums">
              {pageSafe} / {totalPages}
            </span>
            <button
              type="button"
              disabled={pageSafe >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
