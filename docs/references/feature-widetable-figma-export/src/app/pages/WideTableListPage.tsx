import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { FilterBar } from "@/app/components/FilterBar";
import { WideTableList, WideTableRow } from "@/app/components/WideTableList";
import { Pagination } from "@/app/components/Pagination";
import { AddWideTableModal, WideTableFormValues } from "@/app/components/AddWideTableModal";
import { MOCK_WIDE_TABLES } from "@/data/mockWideTables";

const CURRENT_USER = "cedric.chencan@seamoney.com";

export function WideTableListPage() {
  const navigate = useNavigate();
  const [filterValues, setFilterValues] = useState({
    name: "",
    region: "",
    owner: "",
    bizTeam: "",
  });
  const [ownedByMe, setOwnedByMe] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [showAddModal, setShowAddModal] = useState(false);

  const filtered = useMemo(() => {
    return MOCK_WIDE_TABLES.filter((row) => {
      const matchName =
        !filterValues.name ||
        row.name.toLowerCase().includes(filterValues.name.toLowerCase());
      const matchRegion =
        !filterValues.region ||
        filterValues.region === "All Regions" ||
        row.region.includes(filterValues.region);
      const matchOwner =
        !filterValues.owner ||
        row.owners.some((o) =>
          o.toLowerCase().includes(filterValues.owner.toLowerCase())
        );
      const matchBizTeam =
        !filterValues.bizTeam ||
        row.bizTeam.toLowerCase().includes(filterValues.bizTeam.toLowerCase());
      const matchOwnedByMe =
        !ownedByMe || row.owners.includes(CURRENT_USER);
      return matchName && matchRegion && matchOwner && matchBizTeam && matchOwnedByMe;
    });
  }, [filterValues, ownedByMe]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const goCanvasNew = (values: WideTableFormValues) => {
    setShowAddModal(false);
    navigate("/wt/canvas/new", { state: { formValues: values } });
  };

  const goCanvasEdit = (row: WideTableRow) => {
    navigate(`/wt/canvas/edit/${row.id}`);
  };

  const goCanvasInstance = (row: WideTableRow, instanceId: string) => {
    navigate(`/wt/canvas/instance/${row.id}/${encodeURIComponent(instanceId)}`);
  };

  return (
    <div className="min-h-full bg-gray-50/70">
      <main className="max-w-screen-2xl mx-auto px-6 py-6 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-gray-800">Feature WideTable</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Manage and monitor all WideTable instances across regions.
            </p>
          </div>
        </div>

        <FilterBar
          onQuery={(vals) => {
            setFilterValues(vals);
            setCurrentPage(1);
          }}
          onReset={() => {
            setFilterValues({ name: "", region: "", owner: "", bizTeam: "" });
            setCurrentPage(1);
          }}
        />

        <WideTableList
          data={paginated}
          onAdd={() => setShowAddModal(true)}
          onEdit={goCanvasEdit}
          onView={goCanvasInstance}
          ownedByMe={ownedByMe}
          onOwnedByMeChange={(v) => {
            setOwnedByMe(v);
            setCurrentPage(1);
          }}
        />

        <Pagination
          total={filtered.length}
          current={currentPage}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(s) => {
            setPageSize(s);
            setCurrentPage(1);
          }}
        />
      </main>

      {showAddModal && (
        <AddWideTableModal
          onClose={() => setShowAddModal(false)}
          onConfirm={goCanvasNew}
        />
      )}
    </div>
  );
}
