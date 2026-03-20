import React, { useState } from "react";
import { Search, ChevronUp, ChevronDown, RotateCcw } from "lucide-react";
import { FilterState } from "./types";

interface FilterBarProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onSearch: () => void;
  onReset: () => void;
}

const regionOptions = ["All", "TH", "ID", "MX", "SG", "PH", "VN", "BR", "SHOPEE_SG"];
const entityOptions = ["All", "user_id", "item_id", "shop_id"];
const servingAvailOptions = ["All", "TRUE", "FALSE"];

const selectCls =
  "flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#13c2c2]/30 focus:border-[#13c2c2] transition-all text-gray-700 appearance-none cursor-pointer";

export function FilterBar({ filters, onFiltersChange, onSearch, onReset }: FilterBarProps) {
  const [collapsed, setCollapsed] = useState(false);

  const update = (key: keyof FilterState, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">

      {/* Row 1 — always visible */}
      <div className="px-5 pt-4 pb-3 grid grid-cols-3 gap-4">
        {/* Feature keyword */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 whitespace-nowrap w-16 shrink-0">Feature:</span>
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search feature name..."
              value={filters.keyword}
              onChange={(e) => update("keyword", e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#13c2c2]/30 focus:border-[#13c2c2] transition-all placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Region */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 whitespace-nowrap w-14 shrink-0">Region:</span>
          <select
            value={filters.region}
            onChange={(e) => update("region", e.target.value)}
            className={selectCls}
          >
            {regionOptions.map((r) => (
              <option key={r} value={r === "All" ? "" : r}>
                {r === "All" ? "Please select" : r}
              </option>
            ))}
          </select>
        </div>

        {/* Entity */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 whitespace-nowrap w-12 shrink-0">Entity:</span>
          <select
            value={filters.entity}
            onChange={(e) => update("entity", e.target.value)}
            className={selectCls}
          >
            {entityOptions.map((e) => (
              <option key={e} value={e === "All" ? "" : e}>
                {e === "All" ? "Please select" : e}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 2 — only when expanded */}
      {!collapsed && (
        <div className="px-5 pb-4 grid grid-cols-3 gap-4">
          {/* Serving Avail. */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 whitespace-nowrap w-24 shrink-0">Serving Avail.:</span>
            <select
              value={filters.servingAvail}
              onChange={(e) => update("servingAvail", e.target.value)}
              className={selectCls}
            >
              {servingAvailOptions.map((o) => (
                <option key={o} value={o === "All" ? "" : o}>
                  {o === "All" ? "Please select" : o}
                </option>
              ))}
            </select>
          </div>

          {/* spacers */}
          <div />
          <div />
        </div>
      )}

      {/* Action bar */}
      <div className="px-5 py-2.5 flex items-center justify-end gap-2 border-t border-gray-100 bg-gray-50/50">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#13c2c2] transition-colors px-2 py-1 rounded"
        >
          {collapsed ? (
            <>Expand <ChevronDown size={14} /></>
          ) : (
            <>Collapse <ChevronUp size={14} /></>
          )}
        </button>
        <button
          onClick={onSearch}
          className="flex items-center gap-1.5 px-5 py-1.5 bg-[#13c2c2] hover:bg-[#0fb0b0] text-white text-sm rounded-lg transition-colors shadow-sm"
        >
          <Search size={13} />
          Search
        </button>
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 px-4 py-1.5 border border-gray-200 text-gray-600 hover:text-gray-800 hover:border-gray-300 text-sm rounded-lg transition-colors bg-white"
        >
          <RotateCcw size={13} />
          Reset
        </button>
      </div>
    </div>
  );
}
