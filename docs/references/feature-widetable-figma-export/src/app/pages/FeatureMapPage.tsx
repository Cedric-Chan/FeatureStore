import { useMemo, useState } from "react";
import { Database, RefreshCw } from "lucide-react";
import { FilterBar } from "@/app/components/feature-map/FilterBar";
import { ModuleTree } from "@/app/components/feature-map/ModuleTree";
import { FeatureTable } from "@/app/components/feature-map/FeatureTable";
import { Pagination } from "@/app/components/feature-map/Pagination";
import { FeatureCart } from "@/app/components/feature-map/FeatureCart";
import { mockFeatures, mockModules } from "@/app/components/feature-map/mockData";
import type { FilterState } from "@/app/components/feature-map/types";

const DEFAULT_FILTERS: FilterState = {
  keyword: "",
  region: "",
  entity: "",
  servingAvail: "",
};

export function FeatureMapPage() {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [selectedNode, setSelectedNode] = useState<{
    type: "module" | "group";
    id: string;
  } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(["f1", "f2", "f3"])
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const filteredFeatures = useMemo(() => {
    let result = [...mockFeatures];

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
        pageIds.forEach((pid) => next.delete(pid));
      } else {
        pageIds.forEach((pid) => next.add(pid));
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
    <div className="min-h-full bg-[#f5f7fa]">
      <header className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-3 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#13c2c2] flex items-center justify-center shadow-sm">
            <Database size={14} className="text-white" />
          </div>
          <div>
            <h1
              className="text-gray-800 leading-tight"
              style={{ fontSize: "15px", fontWeight: 600 }}
            >
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
        <FilterBar
          filters={filters}
          onFiltersChange={setFilters}
          onSearch={handleSearch}
          onReset={handleReset}
        />

        <div className="flex gap-4 items-start">
          <ModuleTree
            modules={mockModules}
            selectedNode={selectedNode}
            onSelectNode={setSelectedNode}
          />

          <div className="flex-1 min-w-0 flex flex-col gap-3">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {selectedIds.size > 0 ? (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 text-sm text-[#13c2c2]">
                      <span className="w-2 h-2 rounded-full bg-[#13c2c2] inline-block" />
                      <span className="font-medium">{selectedIds.size}</span>{" "}
                      feature(s) selected
                    </span>
                    <button
                      type="button"
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

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <FeatureTable
                features={paginatedFeatures}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
                onToggleAll={handleToggleAll}
              />
            </div>

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
