export interface Feature {
  id: string;
  name: string;
  region: string;
  featureGroup: string;
  module: string;
  entity: string;
  dataType: string;
  training: boolean | null;
  serving: boolean | null;
  updateTime: string;
}

export interface FeatureGroup {
  id: string;
  name: string;
  features: Feature[];
}

export interface Module {
  id: string;
  name: string;
  groups: FeatureGroup[];
}

export interface FilterState {
  keyword: string;
  region: string;
  entity: string;
  servingAvail: string;
}