import React, { useState, useMemo } from "react";
import { Database, RefreshCw } from "lucide-react";
import { FilterBar } from "./components/feature-map/FilterBar";
import { ModuleTree } from "./components/feature-map/ModuleTree";
import { FeatureTable } from "./components/feature-map/FeatureTable";
import { Pagination } from "./components/feature-map/Pagination";
import { FeatureCart } from "./components/feature-map/FeatureCart";
import { mockFeatures, mockModules } from "./components/feature-map/mockData";
import { FilterState } from "./components/feature-map/types";

const DEFAULT_FILTERS: FilterState = {
  keyword: "",
  region: "",
  entity: "",
  servingAvail: "",
};

export default function App() {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [selectedNode, setSelectedNode] = useState<{ type: "module" | "group"; id: string } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(["f1", "f2", "f3"]));
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Filter features
  const filteredFeatures = useMemo(() => {
    let result = [...mockFeatures];

    // Tree navigation filter
    if (selectedNode) {
      if (selectedNode.type === "module") {
        const mod = mockModules.find((m) => m.id === selectedNode.id);
        if (mod) {
          const groupNames = new Set(mod.groups.map((g) => g.name));
          result = result.filter((f) => groupNames.has(f.featureGroup));
        }
      } else {
        const allGroups = mockModules.flatMap((m) => m.groups);
        const group = allGroups.find((g) => g.id === selectedNode.id);
        if (group) {
          result = result.filter((f) => f.featureGroup === group.name);
        }
      }
    }

    // Applied filters
    if (appliedFilters.keyword) {
      const kw = appliedFilters.keyword.toLowerCase();
      result = result.filter(
        (f) =>
          f.name.toLowerCase().includes(kw) ||
          f.featureGroup.toLowerCase().includes(kw)
      );
    }
    if (appliedFilters.region) {
      result = result.filter((f) => f.region === appliedFilters.region);
    }
    if (appliedFilters.entity) {
      result = result.filter((f) => f.entity === appliedFilters.entity);
    }
    if (appliedFilters.servingAvail === "TRUE") {
      result = result.filter((f) => f.serving === true);
    } else if (appliedFilters.servingAvail === "FALSE") {
      result = result.filter((f) => f.serving !== true);
    }

    return result;
  }, [appliedFilters, selectedNode]);

  // Paginated features
  const paginatedFeatures = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredFeatures.slice(start, start + pageSize);
  }, [filteredFeatures, page, pageSize]);

  const selectedFeatures = useMemo(
    () => mockFeatures.filter((f) => selectedIds.has(f.id)),
    [selectedIds]
  );

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleAll = () => {
    const pageIds = new Set(paginatedFeatures.map((f) => f.id));
    const allSelected = paginatedFeatures.every((f) => selectedIds.has(f.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleSearch = () => {
    setAppliedFilters({ ...filters });
    setPage(1);
  };

  const handleReset = () => {
    setFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
    setPage(1);
  };

  const handleRemoveFromCart = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleClearCart = () => setSelectedIds(new Set());

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      {/* Top Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-3 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#13c2c2] flex items-center justify-center shadow-sm">
            <Database size={14} className="text-white" />
          </div>
          <div>
            <h1 className="text-gray-800 leading-tight" style={{ fontSize: "15px", fontWeight: 600 }}>
              Feature Map
            </h1>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs text-gray-400">
          <RefreshCw size={11} />
          <span>Last updated: 2026-02-23 10:00</span>
        </div>
      </header>

      <main className="p-5 flex flex-col gap-4 max-w-[1600px] mx-auto">
        {/* Filter Bar */}
        <FilterBar
          filters={filters}
          onFiltersChange={setFilters}
          onSearch={handleSearch}
          onReset={handleReset}
        />

        {/* Content: Tree + Table */}
        <div className="flex gap-4 items-start">
          {/* Left: Module Tree */}
          <ModuleTree
            modules={mockModules}
            selectedNode={selectedNode}
            onSelectNode={setSelectedNode}
          />

          {/* Right: Table Panel */}
          <div className="flex-1 min-w-0 flex flex-col gap-3">
            {/* Toolbar */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {selectedIds.size > 0 ? (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 text-sm text-[#13c2c2]">
                      <span className="w-2 h-2 rounded-full bg-[#13c2c2] inline-block" />
                      <span className="font-medium">{selectedIds.size}</span> feature(s) selected
                    </span>
                    <button
                      onClick={handleClearCart}
                      className="text-xs text-gray-400 hover:text-gray-600 px-2 py-0.5 rounded border border-gray-200 transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                ) : (
                  <span className="text-sm text-gray-400">
                    {filteredFeatures.length} feature(s) found
                  </span>
                )}
              </div>
              <FeatureCart
                selectedFeatures={selectedFeatures}
                onRemove={handleRemoveFromCart}
                onClear={handleClearCart}
              />
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <FeatureTable
                features={paginatedFeatures}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
                onToggleAll={handleToggleAll}
              />
            </div>

            {/* Pagination */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
              <Pagination
                total={filteredFeatures.length}
                page={page}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={(s) => {
                  setPageSize(s);
                  setPage(1);
                }}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}