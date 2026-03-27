import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  HardDriveDownload,
  PackageCheck,
  PackageOpen,
  Plus,
  Send,
  UserCircle2,
  Wrench,
} from "lucide-react";

import api from "../../api/axios";
import ActivityTable from "../../components/dashboard/ActivityTable";
import StatsCard from "../../components/dashboard/StatsCard";
import { useAuth } from "../../context/AuthContext";
import { ROLE_LABELS, ROLES } from "../../utils/roles";

const ADMIN_ROLES = [ROLES.SYSTEM_ADMIN, ROLES.DEPT_ADMIN];

const statColorMap = {
  blue: { accent: "bg-blue-500", soft: "bg-blue-100", text: "text-blue-700" },
  green: {
    accent: "bg-emerald-500",
    soft: "bg-emerald-100",
    text: "text-emerald-700",
  },
  yellow: {
    accent: "bg-amber-500",
    soft: "bg-amber-100",
    text: "text-amber-700",
  },
  red: { accent: "bg-rose-500", soft: "bg-rose-100", text: "text-rose-700" },
};

function buildDemoData(user, isAdmin) {
  const currentUserId = user?.id || 1;
  const currentUserName = user?.full_name || "Current User";
  const currentUserEmail = user?.email || "user@company.com";

  const assets = isAdmin
    ? [
        {
          id: 101,
          name: "MacBook Pro 16",
          category: "Laptop",
          status: "Available",
          assigned_to: null,
          purchase_date: "2025-04-10",
          return_date: null,
          assigned_user: null,
        },
        {
          id: 102,
          name: "Dell Latitude 7440",
          category: "Laptop",
          status: "Assigned",
          assigned_to: currentUserId,
          purchase_date: "2024-11-18",
          return_date: null,
          assigned_user: {
            id: currentUserId,
            full_name: currentUserName,
            email: currentUserEmail,
            role: user?.role || ROLES.SYSTEM_ADMIN,
            department: "IT",
            employee_id: "EMP001",
            is_active: true,
            created_at: new Date().toISOString(),
          },
        },
        {
          id: 103,
          name: "HP LaserJet Pro",
          category: "Printer",
          status: "Maintenance",
          assigned_to: null,
          purchase_date: "2023-09-01",
          return_date: null,
          assigned_user: null,
        },
      ]
    : [
        {
          id: 102,
          name: "Dell Latitude 7440",
          category: "Laptop",
          status: "Assigned",
          assigned_to: currentUserId,
          purchase_date: "2024-11-18",
          return_date: null,
          assigned_user: {
            id: currentUserId,
            full_name: currentUserName,
            email: currentUserEmail,
            role: user?.role || ROLES.EMPLOYEE,
            department: "Engineering",
            employee_id: "EMP003",
            is_active: true,
            created_at: new Date().toISOString(),
          },
        },
      ];

  const assignments = [
    {
      id: 201,
      asset_id: 102,
      user_id: currentUserId,
      assigned_date: "2026-03-20",
      return_date: null,
      asset: assets.find((asset) => asset.id === 102) || assets[0],
      user: { id: currentUserId, full_name: currentUserName, email: currentUserEmail },
    },
    {
      id: 202,
      asset_id: 101,
      user_id: currentUserId,
      assigned_date: "2026-03-05",
      return_date: "2026-03-12",
      asset: {
        id: 101,
        name: "MacBook Air M2",
        category: "Laptop",
        status: "Available",
      },
      user: { id: currentUserId, full_name: currentUserName, email: currentUserEmail },
    },
  ];

  return { assets, assignments };
}

export default function Dashboard() {
  const { user } = useAuth();
  const [assets, setAssets] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [usingDemoData, setUsingDemoData] = useState(false);

  const isAdmin = ADMIN_ROLES.includes(user?.role);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    setUsingDemoData(false);

    try {
      const [assetsResponse, assignmentsResponse] = await Promise.all([
        api.get("/assets"),
        api.get("/assignments"),
      ]);

      setAssets(Array.isArray(assetsResponse.data) ? assetsResponse.data : []);
      setAssignments(Array.isArray(assignmentsResponse.data) ? assignmentsResponse.data : []);
    } catch (requestError) {
      setError(
        requestError.response?.data?.detail ||
          "We could not load dashboard data from the API."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const handleRefresh = () => {
      loadDashboard();
    };

    window.addEventListener("dataUpdated", handleRefresh);
    return () => window.removeEventListener("dataUpdated", handleRefresh);
  }, [loadDashboard]);

  const seedDemoData = () => {
    const demo = buildDemoData(user, isAdmin);
    setAssets(demo.assets);
    setAssignments(demo.assignments);
    setUsingDemoData(true);
    setError("");
  };

  const stats = useMemo(() => {
    if (isAdmin) {
      return [
        {
          title: "Total Assets",
          value: assets.length,
          icon: Boxes,
          color: statColorMap.blue,
          subtitle: "Everything currently tracked",
        },
        {
          title: "Available Assets",
          value: assets.filter((asset) => asset.status === "Available").length,
          icon: PackageCheck,
          color: statColorMap.green,
          subtitle: "Ready to be issued",
        },
        {
          title: "Assigned Assets",
          value: assets.filter((asset) => asset.status === "Assigned").length,
          icon: UserCircle2,
          color: statColorMap.yellow,
          subtitle: "Currently in circulation",
        },
        {
          title: "Maintenance Assets",
          value: assets.filter((asset) => asset.status === "Maintenance").length,
          icon: Wrench,
          color: statColorMap.red,
          subtitle: "Temporarily unavailable",
        },
      ];
    }

    return [
      {
        title: "My Assigned Assets",
        value: assets.filter((asset) => asset.status === "Assigned").length,
        icon: PackageOpen,
        color: statColorMap.blue,
        subtitle: "Assets currently with you",
      },
      {
        title: "Returned Assets",
        value: assignments.filter((assignment) => assignment.return_date).length,
        icon: HardDriveDownload,
        color: statColorMap.green,
        subtitle: "Assignment history completed",
      },
      {
        title: "Active Assignments",
        value: assignments.filter((assignment) => !assignment.return_date).length,
        icon: ClipboardList,
        color: statColorMap.yellow,
        subtitle: "Open handovers in progress",
      },
    ];
  }, [assets, assignments, isAdmin]);

  const latestAssignments = useMemo(
    () =>
      [...assignments]
        .sort(
          (left, right) =>
            new Date(right.assigned_date).getTime() -
            new Date(left.assigned_date).getTime()
        )
        .slice(0, 6),
    [assignments]
  );

  const hasNoData = !assets.length && !assignments.length;

  return (
    <>
      {loading ? (
        <div className="loading-panel">
          <div className="loading-spinner" />
          <h2 className="mt-5 text-xl font-semibold text-slate-900">Loading dashboard</h2>
          <p className="mt-2 text-sm text-slate-500">
            Fetching the latest assets and assignment activity from the API.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {error ? (
            <div className="feedback-error">{error}</div>
          ) : null}

          {usingDemoData ? (
            <div className="feedback-info">
              Showing demo placeholders because the API returned no dashboard records
              yet.
            </div>
          ) : null}

          <section
            className={`grid grid-cols-1 gap-4 md:grid-cols-2 ${
              isAdmin ? "xl:grid-cols-4" : "xl:grid-cols-3"
            }`}
          >
            {stats.map((stat) => (
              <StatsCard key={stat.title} {...stat} />
            ))}
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <ActivityTable
              assignments={latestAssignments}
              isEmployee={!isAdmin}
              showMockAction={hasNoData}
              onSeedDemoData={seedDemoData}
            />

            <div className="space-y-6">
              {isAdmin ? (
                <div className="card">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="section-title">Quick Actions</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Start common admin workflows.
                      </p>
                    </div>
                    <Send className="h-5 w-5 text-slate-400" />
                  </div>
                  <div className="mt-5 grid gap-3">
                    <Link
                      to="/assets"
                      className="btn-primary inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3"
                    >
                      <Plus className="h-4 w-4" />
                      Create Asset
                    </Link>
                    <Link
                      to="/assign"
                      className="btn-secondary inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3"
                    >
                      <Send className="h-4 w-4" />
                      Assign Asset
                    </Link>
                  </div>
                </div>
              ) : null}

              <div className="card bg-gradient-to-br from-slate-900 via-slate-800 to-sky-900 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-sky-200/80">
                      Access Profile
                    </p>
                    <h3 className="mt-3 text-xl font-semibold">
                      {ROLE_LABELS[user?.role] || "User"}
                    </h3>
                  </div>
                  <BarChart3 className="h-7 w-7 text-sky-200" />
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-200">
                  {isAdmin
                    ? "You can monitor all assets, review assignment history, and coordinate inventory actions."
                    : "You can track only your assigned assets and review your own assignment history."}
                </p>
              </div>

              {hasNoData ? (
                <div className="card">
                  <h3 className="section-title">Empty State</h3>
                  <p className="mt-2 text-sm text-slate-500">
                    No data available from the backend yet. You can load demo
                    placeholders to preview the dashboard layout.
                  </p>
                  <button
                    type="button"
                    onClick={seedDemoData}
                    className="btn-secondary mt-4 px-4 py-3"
                  >
                    Load Demo Data
                  </button>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
