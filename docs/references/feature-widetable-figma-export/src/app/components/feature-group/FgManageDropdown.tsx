import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  RotateCcw,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import type { FeatureGroupStatus } from "./fgSeed";

/** Downstream services (mock) shown when Online → Draft */
export const MOCK_FG_DRAFT_DOWNSTREAM = [
  "scoring-api-th",
  "risk-gateway-mx",
  "feature-lookup-svc",
];

export function FgManageDropdown({
  status,
  onOnlineIntent,
  onDraftConfirm,
  onDeleteConfirm,
  compact = false,
}: {
  status: FeatureGroupStatus;
  onOnlineIntent: () => void;
  onDraftConfirm: () => void;
  onDeleteConfirm: () => void;
  /** Smaller trigger (list cards) */
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [confirmDraft, setConfirmDraft] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setConfirmDraft(false);
        setConfirmDelete(false);
      }
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const canOnline =
    status === "Draft" ||
    status === "Online Changing" ||
    status === "Disable" ||
    status === "Offline";
  const canDraft = status === "Online";
  const canDelete = status === "Draft";

  function toggle() {
    setOpen((v) => !v);
    setConfirmDraft(false);
    setConfirmDelete(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={toggle}
        className={
          compact
            ? "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg text-white transition-all hover:opacity-90 min-h-[44px]"
            : "flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg text-white transition-all hover:opacity-90 min-h-[44px]"
        }
        style={{ backgroundColor: "#13c2c2", fontWeight: 500 }}
      >
        Manage
        <ChevronDown size={compact ? 11 : 13} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden"
          style={{ minWidth: compact ? 168 : 176 }}
        >
          {confirmDelete ? (
            <div className="p-4" style={{ width: 240 }}>
              <div className="flex gap-2.5 mb-3">
                <AlertTriangle size={15} className="flex-shrink-0 mt-0.5 text-red-500" />
                <p className="text-xs text-gray-700 leading-relaxed">
                  Soft-delete this draft? It will disappear from the list.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteConfirm();
                    setOpen(false);
                    setConfirmDelete(false);
                  }}
                  className="px-3 py-1.5 text-xs rounded text-white bg-red-500 hover:bg-red-600 font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          ) : confirmDraft ? (
            <div className="p-4" style={{ width: 280 }}>
              <div className="flex gap-2.5 mb-2">
                <AlertTriangle size={15} className="flex-shrink-0 mt-0.5 text-amber-500" />
                <p className="text-xs text-gray-700 leading-relaxed">
                  Revert to <span className="font-semibold">Draft</span>? Downstream services (mock):
                </p>
              </div>
              <ul className="text-xs text-gray-600 mb-3 pl-4 list-disc space-y-0.5">
                {MOCK_FG_DRAFT_DOWNSTREAM.map((s) => (
                  <li key={s} className="font-mono">
                    {s}
                  </li>
                ))}
              </ul>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDraft(false)}
                  className="px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDraftConfirm();
                    setOpen(false);
                    setConfirmDraft(false);
                  }}
                  className="px-3 py-1.5 text-xs rounded text-white bg-amber-500 hover:bg-amber-600 font-medium"
                >
                  Confirm Draft
                </button>
              </div>
            </div>
          ) : (
            <div className="py-1">
              <MenuRow
                icon={<CheckCircle2 size={13} />}
                label="Online"
                enabled={canOnline}
                iconColor="text-emerald-500"
                hover="hover:bg-emerald-50 hover:text-emerald-700"
                onClick={() => {
                  onOnlineIntent();
                  setOpen(false);
                }}
              />
              <MenuRow
                icon={<RotateCcw size={13} />}
                label="Draft"
                enabled={canDraft}
                iconColor="text-amber-500"
                hover="hover:bg-amber-50 hover:text-amber-600"
                onClick={() => setConfirmDraft(true)}
              />
              <div className="h-px bg-gray-100 my-1" />
              <MenuRow
                icon={<Trash2 size={13} />}
                label="Delete"
                enabled={canDelete}
                iconColor="text-red-500"
                hover="hover:bg-red-50 hover:text-red-600"
                danger
                onClick={() => setConfirmDelete(true)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MenuRow({
  icon,
  label,
  enabled,
  iconColor,
  hover,
  danger,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  enabled: boolean;
  iconColor: string;
  hover: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={!enabled}
      onClick={enabled ? onClick : undefined}
      className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-left transition-colors ${
        enabled
          ? `${danger ? "text-red-600" : "text-gray-700"} ${hover} cursor-pointer`
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
