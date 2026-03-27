import {
  FG_SERVING_DEFAULT_CATALOG_BY_NODE,
  getFeatureSourceById,
  getTransformationById,
  type FgServingFieldType,
} from "./fgServingCatalog";

export type FgServingNodeId =
  | "A"
  | "B"
  | "C"
  | "D"
  | "E"
  | "F"
  | "G"
  | "H"
  | "I"
  | "J";

export type FgServingNodeKind =
  | "start"
  | "feature_source"
  | "transformation"
  | "compute"
  | "end";

export interface FgServingNodeDef {
  id: FgServingNodeId;
  kind: FgServingNodeKind;
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  subtitle: string;
}

export const FG_SERVING_CANVAS_W = 1180;
export const FG_SERVING_CANVAS_H = 620;

export const FG_SERVING_EDGES: [FgServingNodeId, FgServingNodeId][] = [
  ["A", "B"],
  ["A", "C"],
  ["A", "D"],
  ["B", "E"],
  ["C", "F"],
  ["D", "G"],
  ["F", "H"],
  ["E", "H"],
  ["E", "I"],
  ["G", "I"],
  ["H", "J"],
  ["I", "J"],
  ["G", "J"],
];

export const FG_SERVING_INITIAL_NODES: FgServingNodeDef[] = [
  {
    id: "A",
    kind: "start",
    x: 36,
    y: 272,
    w: 132,
    h: 72,
    title: "Start",
    subtitle: "Start node",
  },
  {
    id: "B",
    kind: "feature_source",
    x: 208,
    y: 88,
    w: 208,
    h: 76,
    title: "Feature Source 1",
    subtitle: "User Profile Redis",
  },
  {
    id: "C",
    kind: "feature_source",
    x: 208,
    y: 272,
    w: 208,
    h: 76,
    title: "Feature Source 2",
    subtitle: "3rd Data gRPC",
  },
  {
    id: "D",
    kind: "feature_source",
    x: 208,
    y: 456,
    w: 208,
    h: 76,
    title: "Feature Source 3",
    subtitle: "Credit Result HBase",
  },
  {
    id: "E",
    kind: "transformation",
    x: 448,
    y: 88,
    w: 208,
    h: 76,
    title: "Transformation 1",
    subtitle: "User Profile Fts",
  },
  {
    id: "F",
    kind: "transformation",
    x: 448,
    y: 272,
    w: 208,
    h: 76,
    title: "Transformation 2",
    subtitle: "AAI Fts",
  },
  {
    id: "G",
    kind: "transformation",
    x: 448,
    y: 456,
    w: 208,
    h: 76,
    title: "Transformation 3",
    subtitle: "Credit Score",
  },
  {
    id: "H",
    kind: "compute",
    x: 700,
    y: 168,
    w: 196,
    h: 76,
    title: "Compute Code Block 1",
    subtitle: "Compute Fts 1",
  },
  {
    id: "I",
    kind: "compute",
    x: 700,
    y: 368,
    w: 196,
    h: 76,
    title: "Compute Code Block 2",
    subtitle: "Compute Fts 2",
  },
  {
    id: "J",
    kind: "end",
    x: 940,
    y: 272,
    w: 132,
    h: 72,
    title: "End",
    subtitle: "End node",
  },
];

export interface StartInputFieldRow {
  id: string;
  name: string;
  dataType: FgServingFieldType;
}

export type SourceRef =
  | {
      kind: "upstream";
      nodeId: FgServingNodeId;
      field: string;
      fieldType: FgServingFieldType;
    }
  | { kind: "fixed"; value: string };

export interface InputFieldMapping {
  paramName: string;
  paramType: FgServingFieldType;
  source: SourceRef | null;
}

export interface OutputFieldSelection {
  name: string;
  type: FgServingFieldType;
  selected: boolean;
  defaultValue: string;
}

export interface MappedAssetNodeConfig {
  selectedCatalogId: string;
  inputMappings: InputFieldMapping[];
  outputFields: OutputFieldSelection[];
}

export type FgServingNodeConfig =
  | { kind: "start"; inputFields: StartInputFieldRow[] }
  | { kind: "feature_source"; asset: MappedAssetNodeConfig }
  | { kind: "transformation"; asset: MappedAssetNodeConfig }
  | { kind: "compute"; skeleton: true }
  | { kind: "end"; skeleton: true };

export interface FgServingCanvasState {
  nodes: FgServingNodeDef[];
  edges: [FgServingNodeId, FgServingNodeId][];
  configs: Partial<Record<FgServingNodeId, FgServingNodeConfig>>;
}

export type { FgServingFieldType };

function newRowId(): string {
  return `r-${Math.random().toString(36).slice(2, 10)}`;
}

export function buildMappedConfigFromCatalog(
  catalogId: string,
  assetKind: "feature_source" | "transformation"
): MappedAssetNodeConfig {
  const entry =
    assetKind === "feature_source"
      ? getFeatureSourceById(catalogId)
      : getTransformationById(catalogId);
  if (!entry) {
    return { selectedCatalogId: catalogId, inputMappings: [], outputFields: [] };
  }
  return {
    selectedCatalogId: catalogId,
    inputMappings: entry.inputs.map((p) => ({
      paramName: p.name,
      paramType: p.type,
      source: null,
    })),
    outputFields: entry.outputs.map((p) => ({
      name: p.name,
      type: p.type,
      selected: true,
      defaultValue: "",
    })),
  };
}

function defaultStartFields(entitiesColumns: string[]): StartInputFieldRow[] {
  if (entitiesColumns.length === 0) {
    return [{ id: newRowId(), name: "entity_id", dataType: "string" }];
  }
  return entitiesColumns.map((name) => ({
    id: newRowId(),
    name,
    dataType: "string" as FgServingFieldType,
  }));
}

function buildDefaultConfigs(
  entitiesColumns: string[]
): Partial<Record<FgServingNodeId, FgServingNodeConfig>> {
  const configs: Partial<Record<FgServingNodeId, FgServingNodeConfig>> = {
    A: { kind: "start", inputFields: defaultStartFields(entitiesColumns) },
    H: { kind: "compute", skeleton: true },
    I: { kind: "compute", skeleton: true },
    J: { kind: "end", skeleton: true },
  };
  (["B", "C", "D", "E", "F", "G"] as const).forEach((nid) => {
    const def = FG_SERVING_DEFAULT_CATALOG_BY_NODE[nid];
    if (!def) return;
    const asset = buildMappedConfigFromCatalog(def.catalogId, def.kind);
    if (def.kind === "feature_source") {
      configs[nid] = { kind: "feature_source", asset };
    } else {
      configs[nid] = { kind: "transformation", asset };
    }
  });
  return configs;
}

export function createInitialFgServingState(
  entitiesColumns: string[]
): FgServingCanvasState {
  return {
    nodes: FG_SERVING_INITIAL_NODES.map((n) => ({ ...n })),
    edges: [...FG_SERVING_EDGES],
    configs: buildDefaultConfigs(entitiesColumns),
  };
}

export function cloneFgServingState(s: FgServingCanvasState): FgServingCanvasState {
  return JSON.parse(JSON.stringify(s)) as FgServingCanvasState;
}

export function getUpstreamIds(
  edges: [FgServingNodeId, FgServingNodeId][],
  nodeId: FgServingNodeId
): FgServingNodeId[] {
  return edges.filter(([, to]) => to === nodeId).map(([from]) => from);
}

function getStartOutputs(
  cfg: FgServingNodeConfig | undefined
): { name: string; type: FgServingFieldType }[] {
  if (!cfg || cfg.kind !== "start") return [];
  return cfg.inputFields.map((r) => ({ name: r.name, type: r.dataType }));
}

function getMappedAssetOutputs(
  cfg: FgServingNodeConfig | undefined
): { name: string; type: FgServingFieldType }[] {
  if (!cfg || (cfg.kind !== "feature_source" && cfg.kind !== "transformation")) {
    return [];
  }
  return cfg.asset.outputFields
    .filter((o) => o.selected)
    .map((o) => ({ name: o.name, type: o.type }));
}

const COMPUTE_OUTPUTS: Record<
  "H" | "I",
  { name: string; type: FgServingFieldType }[]
> = {
  H: [
    { name: "compute_fts_1", type: "map" },
    { name: "compute_meta_1", type: "string" },
  ],
  I: [
    { name: "compute_fts_2", type: "map" },
    { name: "compute_meta_2", type: "string" },
  ],
};

export function getOutputsForNode(
  state: FgServingCanvasState,
  nodeId: FgServingNodeId
): { name: string; type: FgServingFieldType }[] {
  const node = state.nodes.find((n) => n.id === nodeId);
  const cfg = state.configs[nodeId];
  if (!node) return [];
  if (node.kind === "start") return getStartOutputs(cfg);
  if (node.kind === "feature_source" || node.kind === "transformation") {
    return getMappedAssetOutputs(cfg);
  }
  if (node.kind === "compute" && (nodeId === "H" || nodeId === "I")) {
    return COMPUTE_OUTPUTS[nodeId];
  }
  return [];
}

export interface UpstreamOutputGroup {
  nodeId: FgServingNodeId;
  title: string;
  fields: { name: string; type: FgServingFieldType }[];
}

export function listUpstreamOutputGroups(
  state: FgServingCanvasState,
  targetId: FgServingNodeId
): UpstreamOutputGroup[] {
  const ups = getUpstreamIds(state.edges, targetId);
  return ups.map((uid) => {
    const n = state.nodes.find((x) => x.id === uid);
    return {
      nodeId: uid,
      title: n?.title ?? uid,
      fields: getOutputsForNode(state, uid),
    };
  });
}

export function countMappedInputs(mappings: InputFieldMapping[]): number {
  return mappings.filter((m) => m.source !== null).length;
}

export function resolveServingNodeConfig(
  state: FgServingCanvasState,
  node: FgServingNodeDef,
  entitiesColumns: string[]
): FgServingNodeConfig {
  const hit = state.configs[node.id];
  if (hit) return hit;
  const seed = createInitialFgServingState(entitiesColumns);
  const fb = seed.configs[node.id];
  if (!fb) {
    return node.kind === "compute"
      ? { kind: "compute", skeleton: true }
      : { kind: "end", skeleton: true };
  }
  return fb;
}
