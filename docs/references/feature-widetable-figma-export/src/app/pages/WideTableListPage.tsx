import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { Table2 } from "lucide-react";
import { FilterBar } from "@/app/components/FilterBar";
import { WideTableList, WideTableRow, Instance } from "@/app/components/WideTableList";
import { DataReportModal, parseColumnCount } from "@/app/components/DataReportModal";
import { Pagination } from "@/app/components/Pagination";
import { AddWideTableModal, WideTableFormValues } from "@/app/components/AddWideTableModal";
import { getCanvasSnapshotByRow, MOCK_WIDE_TABLES } from "@/data/mockWideTables";

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
  /** When set, Add modal is in Copy-from mode and canvas is seeded from this row's snapshot */
  const [copySourceRow, setCopySourceRow] = useState<WideTableRow | null>(null);
  const [reportInst, setReportInst] = useState<Instance | null>(null);

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
    const fromCopy = copySourceRow;
    setCopySourceRow(null);
    if (fromCopy) {
      navigate("/wt/canvas/new", {
        state: {
          formValues: values,
          canvasSnapshot: getCanvasSnapshotByRow(fromCopy),
          emptyNodeLastInstance: true,
        },
      });
    } else {
      navigate("/wt/canvas/new", { state: { formValues: values } });
    }
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setCopySourceRow(null);
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
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#13c2c2] flex items-center justify-center shadow-sm">
              <Table2 size={14} className="text-white" />
            </div>
            <div>
              <h1
                className="text-gray-800 leading-tight"
                style={{ fontSize: "15px", fontWeight: 600 }}
              >
                Feature WideTable
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                Manage and monitor all WideTable instances across regions.
              </p>
            </div>
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
          onAdd={() => {
            setCopySourceRow(null);
            setShowAddModal(true);
          }}
          onEdit={goCanvasEdit}
          onCopy={(row) => {
            setCopySourceRow(row);
            setShowAddModal(true);
          }}
          onView={goCanvasInstance}
          onReport={(_, inst) => setReportInst(inst)}
          onTask={(_, inst) =>
            navigate(`/wt/task/${encodeURIComponent(inst.id)}`)
          }
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
          key={copySourceRow ? `copy-${copySourceRow.id}` : "create"}
          mode={copySourceRow ? "copy" : "create"}
          copySourceName={copySourceRow?.name}
          onClose={closeAddModal}
          onConfirm={goCanvasNew}
        />
      )}

      {reportInst && (
        <DataReportModal
          key={reportInst.id}
          variant="tabs"
          rawColumnCount={parseColumnCount(reportInst.columnsCnt)}
          cleanColumnCount={Math.max(1, parseColumnCount(reportInst.columnsCnt) - 4)}
          onClose={() => setReportInst(null)}
        />
      )}
    </div>
  );
}
