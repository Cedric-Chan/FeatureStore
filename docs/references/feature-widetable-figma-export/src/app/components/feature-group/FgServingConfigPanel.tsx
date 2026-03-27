import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronRight,
  Info,
  Trash2,
  X,
} from "lucide-react";
import {
  FG_SERVING_FEATURE_SOURCES,
  FG_SERVING_TRANSFORMATIONS,
  getFeatureSourceById,
  getTransformationById,
  type FgServingFieldType,
} from "@/data/fgServingCatalog";
import {
  buildMappedConfigFromCatalog,
  cloneFgServingState,
  countMappedInputs,
  listUpstreamOutputGroups,
  type FgServingCanvasState,
  type FgServingNodeConfig,
  type FgServingNodeDef,
  type FgServingNodeId,
  type InputFieldMapping,
  type MappedAssetNodeConfig,
  type SourceRef,
  type StartInputFieldRow,
} from "@/data/fgServingCanvasModel";

const FIELD_TYPES: FgServingFieldType[] = ["string", "int", "bool", "map"];

function formatSourceLabel(ref: SourceRef | null, nodeTitleById: Map<string, string>): string {
  if (!ref) return "Select source…";
  if (ref.kind === "fixed") {
    return ref.value === "" ? "FixedValue" : `FixedValue: ${ref.value}`;
  }
  const title = nodeTitleById.get(ref.nodeId) ?? ref.nodeId;
  return `${title} / ${ref.field} (${ref.fieldType})`;
}

function autofillMappings(
  state: FgServingCanvasState,
  targetId: FgServingNodeId,
  mappings: InputFieldMapping[]
): InputFieldMapping[] {
  const groups = listUpstreamOutputGroups(state, targetId);
  const flat = groups.flatMap((g) =>
    g.fields.map((f) => ({
      nodeId: g.nodeId,
      name: f.name,
      type: f.type,
      title: g.title,
    }))
  );
  return mappings.map((m) => {
    if (m.source !== null) return m;
    const hits = flat.filter((o) => o.name === m.paramName);
    if (hits.length !== 1) return m;
    const h = hits[0];
    return {
      ...m,
      source: {
        kind: "upstream" as const,
        nodeId: h.nodeId,
        field: h.name,
        fieldType: h.type,
      },
    };
  });
}

function SourceCascadePicker({
  param,
  groups,
  nodeTitleById,
  disabled,
  onPick,
  onClear,
}: {
  param: InputFieldMapping;
  groups: ReturnType<typeof listUpstreamOutputGroups>;
  nodeTitleById: Map<string, string>;
  disabled: boolean;
  onPick: (ref: SourceRef) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"root" | "fields" | "fixed">("root");
  const [pickedNode, setPickedNode] = useState<FgServingNodeId | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setStep("root");
        setPickedNode(null);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const openMenu = () => {
    if (disabled) return;
    setOpen((v) => !v);
    setStep("root");
    setPickedNode(null);
  };

  return (
    <div className="relative" ref={rootRef}>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={disabled}
          onClick={openMenu}
          className="flex-1 min-h-[44px] text-left px-3 py-2 text-xs border border-gray-200 rounded-lg bg-white
            hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-1
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {formatSourceLabel(param.source, nodeTitleById)}
        </button>
        {param.source !== null && !disabled && (
          <button
            type="button"
            aria-label="Clear mapping"
            onClick={onClear}
            className="shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg border border-gray-200
              text-gray-400 hover:text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-400"
          >
            <X size={16} />
          </button>
        )}
      </div>
      {open && (
        <div
          className="absolute left-0 right-0 top-full mt-1 z-40 flex rounded-lg border border-gray-200 bg-white shadow-xl overflow-hidden"
          style={{ minHeight: 160 }}
        >
          {step === "root" && (
            <div className="flex-1 py-1 max-h-56 overflow-y-auto">
              {groups.map((g) => (
                <button
                  key={g.nodeId}
                  type="button"
                  className="w-full flex items-center justify-between px-3 py-2.5 text-left text-xs hover:bg-slate-50"
                  onClick={() => {
                    setPickedNode(g.nodeId);
                    setStep("fields");
                  }}
                >
                  <span className="font-medium text-gray-800">{g.title}</span>
                  <ChevronRight size={14} className="text-gray-400" />
                </button>
              ))}
              <button
                type="button"
                className="w-full px-3 py-2.5 text-left text-xs text-blue-600 font-medium hover:bg-blue-50"
                onClick={() => {
                  setStep("fixed");
                  setPickedNode(null);
                }}
              >
                FixedValue
              </button>
            </div>
          )}
          {step === "fields" && pickedNode && (
            <div className="flex-1 flex flex-col border-l border-gray-100 min-w-[200px]">
              <button
                type="button"
                className="px-3 py-2 text-[11px] text-gray-500 hover:bg-gray-50 border-b border-gray-100"
                onClick={() => {
                  setStep("root");
                  setPickedNode(null);
                }}
              >
                ← Back
              </button>
              <div className="py-1 max-h-48 overflow-y-auto">
                {groups
                  .find((x) => x.nodeId === pickedNode)
                  ?.fields.map((f) => (
                    <button
                      key={f.name}
                      type="button"
                      className="w-full text-left px-3 py-2 text-xs hover:bg-teal-50 text-gray-800"
                      onClick={() => {
                        onPick({
                          kind: "upstream",
                          nodeId: pickedNode,
                          field: f.name,
                          fieldType: f.type,
                        });
                        setOpen(false);
                        setStep("root");
                      }}
                    >
                      {f.name}{" "}
                      <span className="text-gray-400">({f.type})</span>
                    </button>
                  ))}
              </div>
            </div>
          )}
          {step === "fixed" && (
            <div className="flex-1 p-3 border-l border-gray-100 min-w-[220px]">
              <button
                type="button"
                className="mb-2 text-[11px] text-gray-500 hover:text-gray-800"
                onClick={() => setStep("root")}
              >
                ← Back
              </button>
              <p className="text-[11px] text-gray-500 mb-2">Constant value for {param.paramName}</p>
              {param.paramType === "bool" ? (
                <select
                  className="w-full min-h-[44px] px-2 text-xs border border-gray-200 rounded-lg"
                  defaultValue=""
                  onChange={(e) => {
                    const v = e.target.value;
                    onPick({ kind: "fixed", value: v });
                    setOpen(false);
                    setStep("root");
                  }}
                >
                  <option value="" disabled>
                    Choose…
                  </option>
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              ) : (
                <>
                  <input
                    type="text"
                    className="w-full min-h-[44px] px-2 text-xs border border-gray-200 rounded-lg"
                    placeholder={
                      param.paramType === "int"
                        ? 'Integer or "null"'
                        : "Enter value"
                    }
                    id={`fixed-${param.paramName}`}
                  />
                  <button
                    type="button"
                    className="mt-2 w-full min-h-[44px] text-xs font-medium bg-teal-500 text-white rounded-lg hover:bg-teal-600"
                    onClick={() => {
                      const el = document.getElementById(
                        `fixed-${param.paramName}`
                      ) as HTMLInputElement | null;
                      onPick({ kind: "fixed", value: el?.value ?? "" });
                      setOpen(false);
                      setStep("root");
                    }}
                  >
                    Apply
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StartPanel({
  cfg,
  readOnly,
  onChange,
}: {
  cfg: Extract<FgServingNodeConfig, { kind: "start" }>;
  readOnly: boolean;
  onChange: (next: Extract<FgServingNodeConfig, { kind: "start" }>) => void;
}) {
  function addRow() {
    onChange({
      ...cfg,
      inputFields: [
        ...cfg.inputFields,
        { id: `r-${Math.random().toString(36).slice(2, 10)}`, name: "", dataType: "string" },
      ],
    });
  }

  function updateRow(id: string, patch: Partial<StartInputFieldRow>) {
    onChange({
      ...cfg,
      inputFields: cfg.inputFields.map((r) =>
        r.id === id ? { ...r, ...patch } : r
      ),
    });
  }

  function removeRow(id: string) {
    onChange({
      ...cfg,
      inputFields: cfg.inputFields.filter((r) => r.id !== id),
    });
  }

  return (
    <section className="space-y-3">
      <h3 className="text-xs font-bold text-gray-800 tracking-wide">INPUT FIELD</h3>
      <div className="space-y-2">
        {cfg.inputFields.map((row) => (
          <div key={row.id} className="flex items-center gap-2">
            <label className="sr-only" htmlFor={`in-name-${row.id}`}>
              Field name
            </label>
            <input
              id={`in-name-${row.id}`}
              disabled={readOnly}
              value={row.name}
              onChange={(e) => updateRow(row.id, { name: e.target.value })}
              className="flex-1 min-w-0 min-h-[44px] px-2 text-xs border border-gray-200 rounded-lg"
              placeholder="field_name"
            />
            <label className="sr-only" htmlFor={`in-type-${row.id}`}>
              Data type
            </label>
            <select
              id={`in-type-${row.id}`}
              disabled={readOnly}
              value={row.dataType}
              onChange={(e) =>
                updateRow(row.id, { dataType: e.target.value as FgServingFieldType })
              }
              className="w-[100px] min-h-[44px] px-1 text-xs border border-gray-200 rounded-lg shrink-0"
            >
              {FIELD_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            {!readOnly && (
              <button
                type="button"
                aria-label={`Delete field ${row.name || row.id}`}
                onClick={() => removeRow(row.id)}
                className="shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-red-600 rounded-lg border border-transparent hover:border-red-100"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}
      </div>
      {!readOnly && (
        <button
          type="button"
          onClick={addRow}
          className="w-full min-h-[44px] text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-200"
        >
          + Add
        </button>
      )}
    </section>
  );
}

function MappedAssetPanel({
  nodeId,
  assetKind,
  asset,
  canvasState,
  readOnly,
  onChangeAsset,
}: {
  nodeId: FgServingNodeId;
  assetKind: "feature_source" | "transformation";
  asset: MappedAssetNodeConfig;
  canvasState: FgServingCanvasState;
  readOnly: boolean;
  onChangeAsset: (next: MappedAssetNodeConfig) => void;
}) {
  const catalog =
    assetKind === "feature_source"
      ? FG_SERVING_FEATURE_SOURCES
      : FG_SERVING_TRANSFORMATIONS;

  const entry = useMemo(() => {
    return assetKind === "feature_source"
      ? getFeatureSourceById(asset.selectedCatalogId)
      : getTransformationById(asset.selectedCatalogId);
  }, [asset.selectedCatalogId, assetKind]);

  const nodeTitleById = useMemo(() => {
    const m = new Map<string, string>();
    canvasState.nodes.forEach((n) => m.set(n.id, n.title));
    return m;
  }, [canvasState.nodes]);

  const upstreamGroups = useMemo(
    () => listUpstreamOutputGroups(canvasState, nodeId),
    [canvasState, nodeId]
  );

  const [outSearch, setOutSearch] = useState("");

  const filteredOutputs = useMemo(() => {
    const q = outSearch.trim().toLowerCase();
    if (!q) return asset.outputFields;
    return asset.outputFields.filter((o) => o.name.toLowerCase().includes(q));
  }, [asset.outputFields, outSearch]);

  const mappedCount = countMappedInputs(asset.inputMappings);
  const totalIn = asset.inputMappings.length;

  function setCatalogId(id: string) {
    const next = buildMappedConfigFromCatalog(id, assetKind);
    onChangeAsset(next);
  }

  function updateMapping(i: number, patch: Partial<InputFieldMapping>) {
    const inputMappings = asset.inputMappings.map((m, j) =>
      j === i ? { ...m, ...patch } : m
    );
    onChangeAsset({ ...asset, inputMappings });
  }

  function autofill() {
    const nextState = cloneFgServingState(canvasState);
    const filled = autofillMappings(nextState, nodeId, asset.inputMappings);
    onChangeAsset({ ...asset, inputMappings: filled });
  }

  const allSelected =
    asset.outputFields.length > 0 &&
    asset.outputFields.every((o) => o.selected);

  function toggleSelectAll(checked: boolean) {
    onChangeAsset({
      ...asset,
      outputFields: asset.outputFields.map((o) => ({ ...o, selected: checked })),
    });
  }

  function toggleOne(name: string, checked: boolean) {
    onChangeAsset({
      ...asset,
      outputFields: asset.outputFields.map((o) =>
        o.name === name ? { ...o, selected: checked } : o
      ),
    });
  }

  function setDefault(name: string, v: string) {
    onChangeAsset({
      ...asset,
      outputFields: asset.outputFields.map((o) =>
        o.name === name ? { ...o, defaultValue: v } : o
      ),
    });
  }

  const selectedOutCount = asset.outputFields.filter((o) => o.selected).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="fg-asset-select" className="text-xs text-gray-500 shrink-0">
          Registered {assetKind === "feature_source" ? "Feature Source" : "Transformation"}
        </label>
        <select
          id="fg-asset-select"
          disabled={readOnly}
          value={asset.selectedCatalogId}
          onChange={(e) => setCatalogId(e.target.value)}
          className="flex-1 min-w-[160px] min-h-[44px] px-2 text-xs border border-gray-200 rounded-lg"
        >
          {catalog.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        {entry && (
          <span className="text-xs font-mono text-teal-700 bg-teal-50 px-2 py-1 rounded-md border border-teal-100">
            {entry.versionTag}
          </span>
        )}
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-3 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-800">Map Input Fields</h3>
          <span className="text-xs text-gray-500">
            Configuration Progress: {mappedCount}/{totalIn || 0}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={readOnly}
            onClick={autofill}
            className="text-xs font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50 min-h-[44px] px-1"
          >
            AutoFill
          </button>
          <span className="text-gray-300">|</span>
          <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
            <Info size={12} className="shrink-0" aria-hidden />
            Match upstream fields by name
          </span>
        </div>
        <div className="space-y-3">
          {asset.inputMappings.map((m, i) => (
            <div
              key={`${m.paramName}-${i}`}
              className="rounded-lg border border-gray-200 bg-gray-50/80 p-3 space-y-2"
            >
              <div className="flex flex-wrap justify-between gap-2 text-xs">
                <span className="text-gray-700">
                  Field: <span className="font-mono font-medium">{m.paramName}</span>
                </span>
                <span className="text-gray-500">type: {m.paramType}</span>
              </div>
              <div>
                <span className="text-[11px] text-gray-500 block mb-1">Source:</span>
                <SourceCascadePicker
                  param={m}
                  groups={upstreamGroups}
                  nodeTitleById={nodeTitleById}
                  disabled={readOnly}
                  onPick={(ref) => updateMapping(i, { source: ref })}
                  onClear={() => updateMapping(i, { source: null })}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-3 space-y-3">
        <h3 className="text-sm font-semibold text-slate-800">Map Output Fields</h3>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[140px] relative">
            <label htmlFor="out-search" className="sr-only">
              Search by field
            </label>
            <input
              id="out-search"
              value={outSearch}
              onChange={(e) => setOutSearch(e.target.value)}
              placeholder="Search by Field"
              className="w-full min-h-[44px] pl-3 pr-2 text-xs border border-gray-200 rounded-lg"
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span>Selected: {selectedOutCount}</span>
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                disabled={readOnly}
                checked={allSelected}
                onChange={(e) => toggleSelectAll(e.target.checked)}
                className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              Select All
            </label>
          </div>
        </div>
        <div className="space-y-2">
          {filteredOutputs.map((o) => (
            <div
              key={o.name}
              className="rounded-lg border border-gray-200 overflow-hidden"
            >
              <div className="flex items-center justify-between gap-2 px-3 py-2 bg-sky-50/90 border-b border-gray-100">
                <div className="text-xs text-gray-700 min-w-0">
                  Field:{" "}
                  <span className="font-mono font-semibold text-slate-800">{o.name}</span>
                  <span className="text-gray-500 ml-2">type: {o.type}</span>
                </div>
                <input
                  type="checkbox"
                  disabled={readOnly}
                  checked={o.selected}
                  onChange={(e) => toggleOne(o.name, e.target.checked)}
                  className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 shrink-0 w-5 h-5"
                  aria-label={`Select output ${o.name}`}
                />
              </div>
              <div className="px-3 py-2 bg-white flex flex-col gap-1">
                <label className="text-[11px] text-gray-500" htmlFor={`def-${o.name}`}>
                  Default Value:
                </label>
                <input
                  id={`def-${o.name}`}
                  disabled={readOnly || !o.selected}
                  value={o.defaultValue}
                  onChange={(e) => setDefault(o.name, e.target.value)}
                  placeholder={
                    o.type === "int" ? 'Enter an integer or "null"' : ""
                  }
                  className="w-full min-h-[44px] px-2 text-xs border border-gray-200 rounded-lg disabled:bg-gray-50"
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function SkeletonPanel({ title }: { title: string }) {
  return (
    <div className="space-y-4" aria-busy="true">
      <p className="text-xs text-gray-500">{title}</p>
      <div className="space-y-2">
        <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
        <div className="h-24 bg-gray-100 rounded-lg animate-pulse" />
        <div className="h-16 bg-gray-100 rounded-lg animate-pulse" />
      </div>
      <p className="text-[11px] text-gray-400">Configuration UI coming soon.</p>
    </div>
  );
}

export function FgServingConfigPanel({
  open,
  node,
  config,
  canvasState,
  readOnly,
  onClose,
  onUpdateConfig,
}: {
  open: boolean;
  node: FgServingNodeDef | null;
  config: FgServingNodeConfig | undefined;
  canvasState: FgServingCanvasState;
  readOnly: boolean;
  onClose: () => void;
  onUpdateConfig: (nodeId: FgServingNodeId, cfg: FgServingNodeConfig) => void;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const renderBody = useCallback(() => {
    if (!node || !config) return null;
    if (config.kind === "start") {
      return (
        <StartPanel
          cfg={config}
          readOnly={readOnly}
          onChange={(next) => onUpdateConfig(node.id, next)}
        />
      );
    }
    if (config.kind === "feature_source") {
      return (
        <MappedAssetPanel
          nodeId={node.id}
          assetKind="feature_source"
          asset={config.asset}
          canvasState={canvasState}
          readOnly={readOnly}
          onChangeAsset={(asset) =>
            onUpdateConfig(node.id, { kind: "feature_source", asset })
          }
        />
      );
    }
    if (config.kind === "transformation") {
      return (
        <MappedAssetPanel
          nodeId={node.id}
          assetKind="transformation"
          asset={config.asset}
          canvasState={canvasState}
          readOnly={readOnly}
          onChangeAsset={(asset) =>
            onUpdateConfig(node.id, { kind: "transformation", asset })
          }
        />
      );
    }
    if (config.kind === "compute") {
      return <SkeletonPanel title="Compute code block settings" />;
    }
    return <SkeletonPanel title="End node" />;
  }, [node, config, readOnly, canvasState, onUpdateConfig]);

  if (!open || !node) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close configuration panel"
        className="fixed inset-0 bg-black/40 z-40 transition-opacity"
        onClick={onClose}
      />
      <aside
        className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white border-l border-gray-200 shadow-2xl z-50 flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fg-serving-panel-title"
      >
        <header className="shrink-0 flex items-start gap-3 px-4 py-4 border-b border-gray-100">
          <div className="min-w-0 flex-1">
            <h2
              id="fg-serving-panel-title"
              className="text-lg font-semibold text-gray-900 leading-tight"
            >
              {node.title}
            </h2>
            <p className="text-xs text-gray-400 mt-1">{node.subtitle}</p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-800 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-400"
          >
            <X size={20} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-4 py-4">{renderBody()}</div>
      </aside>
    </>
  );
}
