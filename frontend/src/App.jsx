import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/common/ProtectedRoute";
import AppShell from "./components/layout/AppShell";
import Login from "./pages/auth/Login";
import Assets from "./pages/assets/Assets";
import MyAssets from "./pages/assets/MyAssets";
import Dashboard from "./pages/dashboard/Dashboard";
import AssignAsset from "./pages/assignments/AssignAsset";
import NotFound from "./pages/NotFound";
import { ROLES } from "./utils/roles";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              borderRadius: "10px",
              background: "#fff",
              color: "#1f2937",
              boxShadow: "0 4px 12px rgb(0 0 0 / 0.10)",
              fontSize: "14px",
            },
          }}
        />
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/assets" element={<Assets />} />
              <Route path="/my-assets" element={<MyAssets />} />
              <Route
                path="/assign"
                element={
                  <ProtectedRoute
                    allowedRoles={[ROLES.SYSTEM_ADMIN, ROLES.DEPT_ADMIN]}
                  >
                    <AssignAsset />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin-panel"
                element={
                  <ProtectedRoute
                    allowedRoles={[ROLES.SYSTEM_ADMIN, ROLES.DEPT_ADMIN]}
                  >
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
