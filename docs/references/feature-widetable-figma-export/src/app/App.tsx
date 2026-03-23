import { Navigate, Route, Routes } from "react-router";
import { AppShell } from "@/app/layout/AppShell";
import { FeatureSourceListPage } from "@/app/pages/FeatureSourceListPage";
import { MigratedPlaceholderPage } from "@/app/pages/MigratedPlaceholderPage";
import { WideTableListPage } from "@/app/pages/WideTableListPage";
import {
  CanvasEditRoute,
  CanvasInstanceRoute,
  CanvasNewRoute,
} from "@/app/pages/CanvasPageRoutes";
import { FeatureGroupDetailPage } from "@/app/pages/FeatureGroupDetailPage";
import { FeatureGroupListPage } from "@/app/pages/FeatureGroupListPage";
import { FeatureMapPage } from "@/app/pages/FeatureMapPage";
import { TaskMonitorPage } from "@/app/pages/TaskMonitorPage";

export default function App() {
  return (
    <Routes>
      <Route path="/wt/canvas/new" element={<CanvasNewRoute />} />
      <Route path="/wt/canvas/edit/:tableId" element={<CanvasEditRoute />} />
      <Route
        path="/wt/canvas/instance/:tableId/:instanceId"
        element={<CanvasInstanceRoute />}
      />

      <Route element={<AppShell />}>
        <Route path="/" element={<Navigate to="/wt" replace />} />
        <Route path="/fs" element={<FeatureSourceListPage />} />
        <Route
          path="/tf"
          element={
            <MigratedPlaceholderPage
              title="Transformation"
              description="Transformation jobs and definitions. Aligns with legacy `page-tf-list`."
            />
          }
        />
        <Route path="/fg" element={<FeatureGroupListPage />} />
        <Route path="/fg/:fgId" element={<FeatureGroupDetailPage />} />
        <Route path="/fm" element={<FeatureMapPage />} />
        <Route path="/wt" element={<WideTableListPage />} />
        <Route path="/wt/task/:instanceId" element={<TaskMonitorPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/wt" replace />} />
    </Routes>
  );
}
