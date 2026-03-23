import { useState, useMemo } from "react";
import { useNavigate, useParams, useSearchParams, useLocation } from "react-router";
import { ArrowLeft, ChevronDown, Maximize2 } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/app/components/ui/collapsible";
import { INITIAL_TRANSFORMATION_ROWS, TF_FILTER_REGIONS } from "@/app/components/transformation/transformationData";
import type { TransformationVersionRow, TfParam } from "@/app/components/transformation/transformationData";
import { TransformationTestModal } from "@/app/components/transformation/TransformationTestModal";

function nextVersionForName(name: string): string {
  const same = INITIAL_TRANSFORMATION_ROWS.filter((r) => r.name === name);
  const nums = same.map((r) => {
    const m = /^V(\d+)$/i.exec(r.version.trim());
    return m ? parseInt(m[1], 10) : 0;
  });
  const max = nums.length ? Math.max(...nums) : 0;
  return `V${max + 1}`;
}

function findRow(name: string, version: string): TransformationVersionRow | undefined {
  return INITIAL_TRANSFORMATION_ROWS.find(
    (r) => r.name === name && r.version === version
  );
}

export function TransformationFormPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { tfName: tfNameEnc, tfVersion: tfVersionEnc } = useParams<{
    tfName?: string;
    tfVersion?: string;
  }>();

  const readOnly = Boolean(
    (location.state as { readOnly?: boolean } | null)?.readOnly
  );
  const isEdit = Boolean(tfNameEnc && tfVersionEnc);
  const decodedName = tfNameEnc ? decodeURIComponent(tfNameEnc) : "";
  const decodedVersion = tfVersionEnc ? decodeURIComponent(tfVersionEnc) : "";

  const copyFrom = searchParams.get("copyFrom");
  const copyVersion = searchParams.get("copyVersion");

  const sourceRow = useMemo(() => {
    if (isEdit) return findRow(decodedName, decodedVersion);
    if (copyFrom && copyVersion)
      return findRow(copyFrom, copyVersion);
    return undefined;
  }, [isEdit, decodedName, decodedVersion, copyFrom, copyVersion]);

  const initialVersion = useMemo(() => {
    if (isEdit) return decodedVersion;
    if (copyFrom) return nextVersionForName(copyFrom);
    return "V1";
  }, [isEdit, decodedVersion, copyFrom]);

  const [name, setName] = useState(
    () => sourceRow?.name ?? (copyFrom ?? "")
  );
  const [type, setType] = useState(() => sourceRow?.type ?? "");
  const [owner, setOwner] = useState(() => sourceRow?.owner ?? "cedric.chencan@seamoney.com");
  const [description, setDescription] = useState(() => sourceRow?.description ?? "");
  const [regions, setRegions] = useState<string[]>(() => [...(sourceRow?.regions ?? [])]);
  const [language, setLanguage] = useState(() => sourceRow?.language ?? "Groovy");
  const [script, setScript] = useState(() => sourceRow?.script ?? "");
  const [inputParams, setInputParams] = useState<TfParam[]>(() =>
    sourceRow?.inputParams?.length
      ? [...sourceRow.inputParams]
      : []
  );
  const [outputParams, setOutputParams] = useState<TfParam[]>(() =>
    sourceRow?.outputParams?.length
      ? [...sourceRow.outputParams]
      : []
  );
  const [scriptExpanded, setScriptExpanded] = useState(false);
  const [detailTestOpen, setDetailTestOpen] = useState(false);
  const [hasPassedTest, setHasPassedTest] = useState(false);

  const syntheticTestRow: TransformationVersionRow = useMemo(
    () => ({
      id: `form-${name || "new"}-${initialVersion}`,
      name: name || "new_transform",
      version: initialVersion,
      type: type || "Aggregator",
      language,
      status: "DRAFT",
      regions: regions.length ? regions : ["SG"],
      owner,
      createTime: new Date().toISOString().slice(0, 19).replace("T", " "),
      description,
      script,
      inputParams: inputParams.length
        ? inputParams
        : [{ name: "scenario_id", dataType: "String" }],
      outputParams: outputParams.length
        ? outputParams
        : [
            { name: "indexs", dataType: "List" },
            { name: "values", dataType: "List" },
          ],
    }),
    [name, initialVersion, type, language, regions, owner, description, script, inputParams, outputParams]
  );

  const canSubmit =
    name.trim() &&
    type &&
    description.trim() &&
    regions.length > 0 &&
    language &&
    script.trim();

  const canHeaderTest = canSubmit;

  const toggleRegion = (r: string) => {
    setRegions((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]
    );
  };

  const addInputParam = () =>
    setInputParams((p) => [...p, { name: "", dataType: "String" }]);
  const addOutputParam = () =>
    setOutputParams((p) => [...p, { name: "", dataType: "String" }]);

  const sectionBtn =
    "flex w-full items-center gap-2 px-4 py-3 bg-slate-100/80 border border-slate-200 rounded-t-lg text-left text-sm font-medium text-slate-800 hover:bg-slate-100 transition-colors";

  return (
    <div className="min-h-full bg-[#f5f7fa] flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={() => navigate("/tf")}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-[15px] font-semibold text-gray-800">
          {isEdit ? "Edit Transformation" : "Add Transformation"}
        </h1>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={readOnly}
            className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            Copy Settings
          </button>
          <button
            type="button"
            disabled={readOnly}
            className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            Edit in Script
          </button>
          <button
            type="button"
            disabled={readOnly}
            className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            Save Draft
          </button>
          <button
            type="button"
            disabled={readOnly || !canHeaderTest}
            onClick={() => setDetailTestOpen(true)}
            className="px-3 py-1.5 text-xs rounded-lg bg-teal-500 text-white hover:bg-teal-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Test
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-5 max-w-3xl mx-auto w-full space-y-4 pb-24">
        <Collapsible defaultOpen className="border border-slate-200 rounded-lg bg-white overflow-hidden">
          <CollapsibleTrigger className={sectionBtn}>
            <ChevronDown className="w-4 h-4 shrink-0" />
            Basic Info
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-4 space-y-4 border-t border-slate-100">
              <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={readOnly || isEdit}
                    placeholder="Please input name."
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg disabled:bg-slate-50"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Version</label>
                  <div className="px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-600 min-w-[52px] text-center">
                    {initialVersion}
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">
                  <span className="text-red-500">*</span> Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  disabled={readOnly}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                >
                  <option value="">Please select</option>
                  <option value="Scalar">Scalar</option>
                  <option value="Aggregator">Aggregator</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Owner</label>
                <input
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  disabled={readOnly}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">
                  <span className="text-red-500">*</span> Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={readOnly}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-y min-h-[72px]"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">
                  <span className="text-red-500">*</span> Region
                </label>
                <div className="flex flex-wrap gap-2 p-2 border border-slate-200 rounded-lg min-h-[42px]">
                  {TF_FILTER_REGIONS.filter(Boolean).map((r) => (
                    <label
                      key={r}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs border cursor-pointer ${
                        regions.includes(r)
                          ? "bg-teal-50 border-teal-300 text-teal-800"
                          : "bg-white border-slate-200 text-slate-600"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={regions.includes(r)}
                        disabled={readOnly}
                        onChange={() => toggleRegion(r)}
                      />
                      {r}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">
                  <span className="text-red-500">*</span> Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  disabled={readOnly}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                >
                  <option value="Groovy">Groovy</option>
                  <option value="Python">Python</option>
                </select>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Collapsible defaultOpen className="border border-slate-200 rounded-lg bg-white overflow-hidden">
          <CollapsibleTrigger className={sectionBtn}>
            <ChevronDown className="w-4 h-4 shrink-0" />
            Transformation Script
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-4 border-t border-slate-100">
              <label className="text-xs text-slate-600 mb-2 block">
                <span className="text-red-500">*</span> Script:
              </label>
              <div className="relative border border-slate-200 rounded-lg overflow-hidden">
                <button
                  type="button"
                  className="absolute top-2 right-2 z-10 p-1.5 rounded bg-white/90 border border-slate-200 text-slate-500 hover:text-teal-600"
                  title="Expand"
                  onClick={() => setScriptExpanded(true)}
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
                <div className="flex">
                  <div className="w-10 bg-slate-50 border-r border-slate-200 py-2 text-right pr-2 text-xs text-slate-400 font-mono select-none">
                    {script.split("\n").map((_, i) => (
                      <div key={i}>{i + 1}</div>
                    ))}
                    {script.length === 0 && <div>1</div>}
                  </div>
                  <textarea
                    value={script}
                    onChange={(e) => setScript(e.target.value)}
                    disabled={readOnly}
                    rows={12}
                    spellCheck={false}
                    className="flex-1 px-3 py-2 text-sm font-mono border-0 focus:ring-0 resize-y min-h-[200px]"
                  />
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Collapsible defaultOpen className="border border-slate-200 rounded-lg bg-white overflow-hidden">
          <CollapsibleTrigger className={sectionBtn}>
            <ChevronDown className="w-4 h-4 shrink-0" />
            Params Config
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-4 space-y-4 border-t border-slate-100">
              <div>
                <p className="text-xs text-slate-600 mb-2">Input Params</p>
                <div className="border border-dashed border-slate-300 rounded-lg p-3 min-h-[56px] flex flex-wrap items-center justify-end gap-2">
                  <div className="flex flex-wrap gap-2 flex-1 mr-auto">
                    {inputParams.map((p, i) => (
                      <div key={i} className="flex gap-1 text-xs">
                        <input
                          value={p.name}
                          disabled={readOnly}
                          onChange={(e) => {
                            const next = [...inputParams];
                            next[i] = { ...next[i], name: e.target.value };
                            setInputParams(next);
                          }}
                          placeholder="name"
                          className="w-24 px-2 py-1 border border-slate-200 rounded"
                        />
                        <input
                          value={p.dataType}
                          disabled={readOnly}
                          onChange={(e) => {
                            const next = [...inputParams];
                            next[i] = { ...next[i], dataType: e.target.value };
                            setInputParams(next);
                          }}
                          placeholder="type"
                          className="w-20 px-2 py-1 border border-slate-200 rounded"
                        />
                      </div>
                    ))}
                  </div>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={addInputParam}
                      className="text-xs text-teal-600 font-medium hover:underline shrink-0"
                    >
                      + Add
                    </button>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-600 mb-2">Output Params</p>
                <div className="border border-dashed border-slate-300 rounded-lg p-3 min-h-[56px] flex flex-wrap items-center justify-end gap-2">
                  <div className="flex flex-wrap gap-2 flex-1 mr-auto">
                    {outputParams.map((p, i) => (
                      <div key={i} className="flex gap-1 text-xs">
                        <input
                          value={p.name}
                          disabled={readOnly}
                          onChange={(e) => {
                            const next = [...outputParams];
                            next[i] = { ...next[i], name: e.target.value };
                            setOutputParams(next);
                          }}
                          placeholder="name"
                          className="w-24 px-2 py-1 border border-slate-200 rounded"
                        />
                        <input
                          value={p.dataType}
                          disabled={readOnly}
                          onChange={(e) => {
                            const next = [...outputParams];
                            next[i] = { ...next[i], dataType: e.target.value };
                            setOutputParams(next);
                          }}
                          placeholder="type"
                          className="w-20 px-2 py-1 border border-slate-200 rounded"
                        />
                      </div>
                    ))}
                  </div>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={addOutputParam}
                      className="text-xs text-teal-600 font-medium hover:underline shrink-0"
                    >
                      + Add
                    </button>
                  )}
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Collapsible defaultOpen className="border border-slate-200 rounded-lg bg-white overflow-hidden">
          <CollapsibleTrigger className={sectionBtn}>
            <ChevronDown className="w-4 h-4 shrink-0" />
            Transformation Agent Review
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-4 border-t border-slate-100 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={readOnly || !hasPassedTest}
                onClick={() => window.alert("AI Review (mock)")}
                className="px-4 py-2 text-sm border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
              >
                AI Review
              </button>
              {!hasPassedTest ? (
                <span className="text-xs text-slate-500">
                  Please pass the Test first to enable AI Review
                </span>
              ) : (
                <span className="text-xs text-emerald-600">Test passed — AI Review is available.</span>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      <footer className="sticky bottom-0 bg-white border-t border-slate-200 px-5 py-3 flex justify-end gap-2 shrink-0">
        <button
          type="button"
          onClick={() => navigate("/tf")}
          className="px-4 py-2 text-sm border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={readOnly || !canSubmit}
          onClick={() => {
            window.alert("Submit (mock)");
            navigate("/tf");
          }}
          className="px-5 py-2 text-sm rounded-lg bg-teal-500 text-white hover:bg-teal-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Submit
        </button>
      </footer>

      {scriptExpanded && (
        <div
          className="fixed inset-0 z-[90] bg-black/50 flex items-center justify-center p-4"
          onClick={() => setScriptExpanded(false)}
        >
          <div
            className="bg-white rounded-xl w-full max-w-4xl h-[80vh] flex flex-col shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center px-4 py-2 border-b">
              <span className="text-sm font-medium">Script</span>
              <button
                type="button"
                className="text-xs text-slate-500 hover:text-slate-800"
                onClick={() => setScriptExpanded(false)}
              >
                Close
              </button>
            </div>
            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              disabled={readOnly}
              className="flex-1 p-4 font-mono text-sm resize-none border-0 focus:ring-0"
            />
          </div>
        </div>
      )}

      <TransformationTestModal
        open={detailTestOpen}
        row={syntheticTestRow}
        onClose={() => setDetailTestOpen(false)}
        onTestSuccess={() => setHasPassedTest(true)}
      />
    </div>
  );
}
