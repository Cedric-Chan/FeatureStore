import { createBrowserRouter } from "react-router";
import FeatureGroupList from "./components/FeatureGroupList";
import FeatureGroupDetail from "./components/FeatureGroupDetail";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: FeatureGroupList,
  },
  {
    path: "/detail/:id",
    Component: FeatureGroupDetail,
  },
]);
