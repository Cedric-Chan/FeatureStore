import { useEffect, useRef } from "react";
import { X } from "lucide-react";

const DIFF_MODAL_TITLE_ID = "fg-config-diff-title";

export function FgConfigDiffModal({
  open,
  oldText,
  newText,
  onClose,
  onConfirm,
}: {
  open: boolean;
  oldText: string;
  newText: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const t = requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>("button")?.focus();
    });
    return () => cancelAnimationFrame(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={DIFF_MODAL_TITLE_ID}
        className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
          <h2 id={DIFF_MODAL_TITLE_ID} className="text-sm font-semibold text-gray-800">
            Config Diff — confirm Online
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
            aria-label="Close config diff"
          >
            <X size={18} />
          </button>
        </div>
        <p className="px-5 py-2 text-xs text-gray-500 border-b border-gray-50">
          Review changes (left: previous published, right: pending). Confirm to set status to Online.
        </p>
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-gray-100">
          <div className="flex flex-col min-h-0 min-w-0">
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-50">
              Old
            </div>
            <pre
              className="flex-1 overflow-auto p-3 text-xs font-mono text-gray-700 bg-amber-50/40 m-0"
              style={{ maxHeight: "50vh" }}
            >
              {oldText}
            </pre>
          </div>
          <div className="flex flex-col min-h-0 min-w-0">
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-50">
              New
            </div>
            <pre
              className="flex-1 overflow-auto p-3 text-xs font-mono text-gray-700 bg-emerald-50/40 m-0"
              style={{ maxHeight: "50vh" }}
            >
              {newText}
            </pre>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50/50 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 min-h-[44px]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 text-sm rounded-xl bg-teal-500 text-white hover:bg-teal-600 shadow-sm min-h-[44px] font-medium"
          >
            Confirm Online
          </button>
        </div>
      </div>
    </div>
  );
}

export const MOCK_FG_DIFF_OLD = `serving:
  version: 2
  nodes:
    - id: B
      title: Frame Table
    - id: F
      title: Data Ingestion
  feature_source: riskfeat_hbase_th
`;

export const MOCK_FG_DIFF_NEW = `serving:
  version: 3
  nodes:
    - id: B
      title: Frame Table
    - id: C
      title: user_profile_features
    - id: F
      title: Data Ingestion
  feature_source: riskfeat_hbase_th
  transformation: QueryAaiCache@V3
`;
