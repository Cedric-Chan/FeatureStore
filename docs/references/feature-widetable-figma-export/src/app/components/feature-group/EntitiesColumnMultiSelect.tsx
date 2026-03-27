import { useState, useEffect, useRef } from "react";
import { ChevronDown, X, Loader2 } from "lucide-react";

export function EntitiesColumnMultiSelect({
  value,
  onChange,
  columns,
  loading,
  disabled,
  hasError,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  columns: string[];
  loading: boolean;
  disabled: boolean;
  hasError?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocMouse(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouse);
    return () => document.removeEventListener("mousedown", onDocMouse);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function toggleCol(name: string) {
    if (value.includes(name)) {
      onChange(value.filter(x => x !== name));
    } else {
      onChange([...value, name]);
    }
  }

  function removeCol(name: string) {
    onChange(value.filter(x => x !== name));
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => { if (!disabled && !loading) setOpen(o => !o); }}
        className={`w-full min-h-[44px] flex items-center gap-1.5 flex-wrap border rounded-lg px-3 py-2 text-left transition-colors ${
          disabled
            ? "border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed"
            : hasError
              ? "border-red-300 bg-red-50"
              : "border-gray-200 bg-white hover:border-[#13c2c2]"
        }`}
      >
        {loading ? (
          <span className="inline-flex items-center gap-2 text-xs text-gray-400">
            <Loader2 size={14} className="animate-spin" />
            Loading columns…
          </span>
        ) : value.length > 0 ? (
          value.map(c => (
            <span
              key={c}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono"
              style={{ background: "#e6fffb", color: "#08979c", border: "1px solid #87e8de" }}
            >
              {c}
              <button
                type="button"
                className="rounded p-0.5 hover:bg-teal-100 text-teal-700"
                onClick={e => { e.stopPropagation(); removeCol(c); }}
                aria-label={`Remove ${c}`}
              >
                <X size={12} aria-hidden />
              </button>
            </span>
          ))
        ) : (
          <span className="text-xs text-gray-400 px-0.5">Select one or more entity columns…</span>
        )}
        <ChevronDown size={14} className="ml-auto text-gray-400 shrink-0 pointer-events-none" />
      </button>

      {open && !disabled && !loading && (
        <div
          className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden"
          style={{ maxHeight: 220 }}
        >
          <div className="p-1 max-h-[220px] overflow-y-auto">
            {columns.length === 0 ? (
              <div className="py-3 px-2 text-center text-xs text-gray-400">No columns loaded yet</div>
            ) : (
              columns.map(col => {
                const on = value.includes(col);
                return (
                  <button
                    key={col}
                    type="button"
                    onClick={() => toggleCol(col)}
                    className={`w-full flex items-center gap-2 px-2.5 py-2.5 min-h-[44px] rounded-md text-left text-xs font-mono transition-colors ${
                      on ? "bg-teal-50 text-teal-800" : "hover:bg-gray-50 text-gray-700"
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                        on ? "bg-[#13c2c2] border-[#13c2c2]" : "border-gray-300 bg-white"
                      }`}
                      aria-hidden
                    >
                      {on && <span className="text-white text-[10px] font-bold">✓</span>}
                    </span>
                    <span className="flex-1">{col}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
