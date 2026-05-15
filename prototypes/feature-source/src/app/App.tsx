import { useState } from "react";
import {
  Database,
  Code2,
  Layers,
  Server,
  LayoutList,
} from "lucide-react";
import { FeatureSourcePage } from "./components/FeatureSourcePage";
import { DataSourceMappingPage } from "./components/DataSourceMappingPage";

type Page =
  | "datasource"
  | "featuresource"
  | "featuregroup"
  | "widetable"
  | "featureservice";

const NAV_GROUPS: {
  label: string;
  items: { id: Page; label: string; icon: React.ElementType }[];
}[] = [
  {
    label: "Sources",
    items: [
      {
        id: "datasource",
        label: "Data Source",
        icon: Database,
      },
      {
        id: "featuresource",
        label: "Feature Source",
        icon: Code2,
      },
    ],
  },
  {
    label: "Features",
    items: [
      {
        id: "featuregroup",
        label: "Feature Group",
        icon: Layers,
      },
      {
        id: "widetable",
        label: "Feature WideTable",
        icon: LayoutList,
      },
      {
        id: "featureservice",
        label: "Feature Service",
        icon: Server,
      },
    ],
  },
];

function SkeletonPage({ title }: { title: string }) {
  return (
    <div
      className="p-8"
      style={{ background: "#f5f6f8", minHeight: "100%" }}
    >
      <div className="max-w-4xl">
        <h1 className="text-lg text-slate-800 mb-1">{title}</h1>
        <p className="text-xs text-slate-400 mb-8">
          This section is under construction.
        </p>
        <div className="space-y-2.5">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-11 rounded-xl bg-white border border-slate-200 animate-pulse"
              style={{ opacity: 1 - i * 0.12 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState<Page>("datasource");

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-48 flex-shrink-0 flex flex-col overflow-y-auto bg-slate-900">
        {/* Brand */}
        <div className="px-4 py-3.5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-teal-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-[10px] font-bold">
                F
              </span>
            </div>
            <span className="text-white text-xs font-medium tracking-wide">
              Feature Platform
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <div className="flex items-center gap-2 px-3 mb-1">
                <span className="text-[9px] uppercase tracking-widest text-slate-600 font-semibold whitespace-nowrap">{group.label}</span>
                <div className="flex-1 h-px bg-slate-700/60" />
              </div>
              <div className="space-y-px">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = page === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setPage(item.id)}
                      className={`w-full flex items-center gap-2.5 pl-3 pr-2.5 py-2 text-xs transition-all relative ${
                        active
                          ? "text-white bg-white/8"
                          : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                      }`}
                    >
                      {active && <span className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-teal-400" />}
                      <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${active ? "text-teal-400" : ""}`} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {page === "datasource" && <DataSourceMappingPage />}
        {page === "featuresource" && <FeatureSourcePage />}
        {page === "featuregroup" && (
          <SkeletonPage title="Feature Group" />
        )}
        {page === "widetable" && (
          <SkeletonPage title="Feature WideTable" />
        )}
        {page === "featureservice" && (
          <SkeletonPage title="Feature Service" />
        )}
      </main>
    </div>
  );
}