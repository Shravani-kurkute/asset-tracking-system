import { useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Boxes,
  CalendarDays,
  LayoutDashboard,
  LogOut,
  PackageOpen,
  Send,
  Shield,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { ROLE_LABELS, ROLES } from "../../utils/roles";

const ADMIN_ROLES = [ROLES.SYSTEM_ADMIN, ROLES.DEPT_ADMIN];

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/assets", label: "Assets", icon: Boxes },
  { to: "/my-assets", label: "My Assets", icon: PackageOpen },
  { to: "/assign", label: "Assign Asset", icon: Send, adminOnly: true },
  { to: "/admin-panel", label: "Admin Panel", icon: Shield, adminOnly: true },
];

const routeMeta = {
  "/dashboard": {
    title: "Dashboard",
    subtitle: "Monitor asset availability, assignments, and handovers in real time.",
    sectionLabel: "Dashboard",
  },
  "/assets": {
    title: "Assets",
    subtitle: "Review your latest asset inventory overview.",
    sectionLabel: "Assets",
  },
  "/my-assets": {
    title: "My Assets",
    subtitle: "Review assets currently mapped to your account.",
    sectionLabel: "Assets",
  },
  "/assign": {
    title: "Assign Asset",
    subtitle: "Assign available inventory to employees and review the latest handover history.",
    sectionLabel: "Assignments",
  },
  "/admin-panel": {
    title: "Admin Panel",
    subtitle: "Access elevated controls and review operational summaries.",
    sectionLabel: "Administration",
  },
};

function buildRoleName(role) {
  if (!role) return "User";
  if (ADMIN_ROLES.includes(role)) return "Admin";
  if (role === ROLES.MANAGEMENT) return "Management";
  return "Employee";
}

function formatHeaderDate() {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date());
}

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = ADMIN_ROLES.includes(user?.role);
  const meta = routeMeta[location.pathname] || {
    title: "Workspace",
    subtitle: "Manage assets and assignments from a shared control center.",
    sectionLabel: "Workspace",
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  useEffect(() => {
    document.title = `${meta.title} | Asset Tracking System`;
  }, [meta.title]);

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 flex-col border-r border-slate-200 bg-white xl:flex">
          <div className="border-b border-slate-200 px-6 py-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-600 shadow-lg shadow-sky-600/20">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                  Asset Tracking
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900">Control Center</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-4 py-6">
            <div className="space-y-1">
              {navItems
                .filter((item) => !item.adminOnly || isAdmin)
                .map((item) => {
                  const Icon = item.icon;
                  const active = location.pathname === item.to;

                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`sidebar-link rounded-xl px-4 py-3 ${
                        active ? "active shadow-sm" : "hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
            </div>

            <div className="mt-8 rounded-3xl bg-slate-900 p-5 text-white">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
                {meta.sectionLabel}
              </p>
              <p className="mt-3 text-lg font-semibold">
                {isAdmin ? "Operations Overview" : "Personal Asset View"}
              </p>
              <p className="mt-2 text-sm text-slate-300">
                {isAdmin
                  ? "Track inventory, assignments, and maintenance from one place."
                  : "Review issued assets and recent assignment activity."}
              </p>
            </div>
          </nav>
        </aside>

        <main className="flex-1">
          <div className="border-b border-slate-200 bg-white/90 backdrop-blur">
            <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:px-8">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <p className="text-sm font-medium text-sky-600">{meta.sectionLabel}</p>
                  <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">
                    {meta.title}
                  </h1>
                  {meta.subtitle ? (
                    <p className="mt-2 text-sm text-slate-500">{meta.subtitle}</p>
                  ) : null}
                </div>

                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Logged In As
                    </p>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sm font-semibold text-sky-700">
                        {user?.full_name?.charAt(0)?.toUpperCase() || "U"}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{user?.full_name}</p>
                        <p className="text-sm text-slate-500">
                          {ROLE_LABELS[user?.role] || buildRoleName(user?.role)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    <CalendarDays className="h-4 w-4 text-sky-600" />
                    <span>{formatHeaderDate()}</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1 xl:hidden">
                {navItems
                  .filter((item) => !item.adminOnly || isAdmin)
                  .map((item) => {
                    const Icon = item.icon;
                    const active = location.pathname === item.to;

                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        className={`sidebar-link shrink-0 whitespace-nowrap ${
                          active ? "active shadow-sm" : "bg-slate-50"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    );
                  })}
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            {children || <Outlet />}
          </div>
        </main>
      </div>
    </div>
  );
}
