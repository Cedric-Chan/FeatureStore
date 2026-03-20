import { useParams, Link } from "react-router";
import { MigratedPlaceholderPage } from "@/app/pages/MigratedPlaceholderPage";

export function FeatureGroupDetailPage() {
  const { fgId } = useParams<{ fgId: string }>();
  return (
    <div>
      <div className="px-6 pt-4 text-xs text-gray-500">
        <Link to="/fg" className="text-teal-600 hover:underline">
          Feature Group
        </Link>
        <span className="mx-1">/</span>
        <span className="font-mono text-gray-700">{fgId ?? "—"}</span>
      </div>
      <MigratedPlaceholderPage
        title="Feature Group detail"
        description="Detail view for a single feature group (tables, columns, lineage). Port interaction from the legacy HTML page `page-fg-detail`."
      />
    </div>
  );
}
