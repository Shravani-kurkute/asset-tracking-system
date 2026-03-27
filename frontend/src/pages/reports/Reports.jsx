// Reporting page that shows analytics summaries and supports PDF export.

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  ClipboardList,
  Download,
  PackageCheck,
  PieChart as PieChartIcon,
  Wrench,
} from "lucide-react";
import toast from "react-hot-toast";

import api from "../../api/axios";
import StatsCard from "../../components/dashboard/StatsCard";

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

const pieColors = {
  Available: "#10b981",
  Assigned: "#f59e0b",
  Maintenance: "#ef4444",
};

export default function Reports() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  console.log("Reports rendering", summary);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/reports/summary");
      setSummary(response.data || null);
    } catch (requestError) {
      setError(
        requestError.response?.data?.detail ||
          "We could not load reporting analytics right now."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    const handleRefresh = () => {
      loadSummary();
    };

    window.addEventListener("dataUpdated", handleRefresh);
    return () => window.removeEventListener("dataUpdated", handleRefresh);
  }, [loadSummary]);

  const stats = useMemo(() => {
    if (!summary) return [];

    return [
      {
        title: "Total Assets",
        value: summary.total_assets ?? 0,
        icon: BarChart3,
        color: statColorMap.blue,
        subtitle: "All tracked inventory",
      },
      {
        title: "Available",
        value: summary.available_assets ?? 0,
        icon: PackageCheck,
        color: statColorMap.green,
        subtitle: "Ready to be issued",
      },
      {
        title: "Assigned",
        value: summary.assigned_assets ?? 0,
        icon: ClipboardList,
        color: statColorMap.yellow,
        subtitle: "Currently in circulation",
      },
      {
        title: "Maintenance",
        value: summary.maintenance_assets ?? 0,
        icon: Wrench,
        color: statColorMap.red,
        subtitle: "Temporarily unavailable",
      },
    ];
  }, [summary]);

  const categoryData = summary?.assets_by_category ?? [];
  const statusData = summary?.assets_by_status ?? [];
  const maxCategoryCount = Math.max(
    1,
    ...categoryData.map((entry) => entry?.count ?? 0)
  );
  const totalStatusCount = statusData.reduce(
    (sum, entry) => sum + (entry?.count ?? 0),
    0
  );

  const handleDownloadPdf = async () => {
    setDownloading(true);

    try {
      const response = await api.get("/reports/pdf", {
        responseType: "blob",
      });

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "asset-report-summary.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Report PDF downloaded.");
    } catch (requestError) {
      toast.error(
        requestError.response?.data?.detail ||
          "Unable to download the report PDF."
      );
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-panel">
        <div className="loading-spinner" />
        <h2 className="mt-5 text-xl font-semibold text-slate-900">Loading reports</h2>
        <p className="mt-2 text-sm text-slate-500">
          Fetching analytics and category breakdowns from the API.
        </p>
      </div>
    );
  }

  if (!summary && !error) {
    return <div>Loading Reports...</div>;
  }

  return (
    <div className="space-y-6">
      {error ? <div className="feedback-error">{error}</div> : null}

      <section className="card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="section-title">Export Analytics</h2>
            <p className="mt-1 text-sm text-slate-500">
              Download the current reporting snapshot as a PDF for sharing or review.
            </p>
          </div>

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="btn-primary inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3"
          >
            {downloading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {downloading ? "Generating PDF..." : "Download PDF"}
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatsCard key={stat.title} {...stat} />
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="section-title">Assets by Category</h2>
              <p className="mt-1 text-sm text-slate-500">
                Compare inventory volume across each asset category.
              </p>
            </div>
            <BarChart3 className="h-5 w-5 text-slate-400" />
          </div>

          {!categoryData.length ? (
            <div className="empty-state min-h-80">
              <div className="empty-icon">
                <BarChart3 className="h-7 w-7 text-slate-500" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-slate-900">
                No category data
              </h3>
              <p className="mt-2 max-w-md text-sm text-slate-500">
                Asset categories will appear here once inventory records exist.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {categoryData.map((entry) => {
                const count = entry?.count ?? 0;
                const width = `${Math.max((count / maxCategoryCount) * 100, 8)}%`;

                return (
                  <div key={entry?.category || "unknown"} className="space-y-2">
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <span className="font-medium text-slate-700">
                        {entry?.category || "Uncategorized"}
                      </span>
                      <span className="text-slate-500">{count}</span>
                    </div>
                    <div className="h-3 rounded-full bg-slate-100">
                      <div
                        className="h-3 rounded-full bg-sky-600 transition-all"
                        style={{ width }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="section-title">Status Distribution</h2>
              <p className="mt-1 text-sm text-slate-500">
                Review how inventory is split across operational states.
              </p>
            </div>
            <PieChartIcon className="h-5 w-5 text-slate-400" />
          </div>

          {!statusData.length ? (
            <div className="empty-state min-h-80">
              <div className="empty-icon">
                <PieChartIcon className="h-7 w-7 text-slate-500" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-slate-900">
                No status data
              </h3>
              <p className="mt-2 max-w-md text-sm text-slate-500">
                Status analytics will appear here as soon as assets are tracked.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_180px] lg:items-center">
              <div className="space-y-4">
                {statusData.map((entry) => {
                  const count = entry?.count ?? 0;
                  const percent = totalStatusCount
                    ? Math.round((count / totalStatusCount) * 100)
                    : 0;

                  return (
                    <div key={entry?.status || "unknown"} className="space-y-2">
                      <div className="flex items-center justify-between gap-4 text-sm">
                        <div className="flex items-center gap-3">
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{
                              backgroundColor:
                                pieColors[entry?.status] || "#94a3b8",
                            }}
                          />
                          <span className="font-medium text-slate-700">
                            {entry?.status || "Unknown"}
                          </span>
                        </div>
                        <span className="text-slate-500">
                          {count} ({percent}%)
                        </span>
                      </div>
                      <div className="h-3 rounded-full bg-slate-100">
                        <div
                          className="h-3 rounded-full transition-all"
                          style={{
                            width: `${Math.max(percent, 8)}%`,
                            backgroundColor:
                              pieColors[entry?.status] || "#94a3b8",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-3">
                {statusData.map((entry) => (
                  <div
                    key={entry.status}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: pieColors[entry.status] || "#94a3b8" }}
                      />
                      <div>
                        <p className="text-sm font-medium text-slate-900">{entry.status}</p>
                        <p className="text-xs text-slate-500">{entry.count} assets</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="card">
          <p className="text-sm text-slate-500">Pending Requests</p>
          <p className="mt-2 text-4xl font-semibold text-slate-900">
            {summary?.pending_requests ?? 0}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Out of {summary?.total_requests ?? 0} total asset requests in the system.
          </p>
        </div>

        <div className="card">
          <p className="text-sm text-slate-500">Maintenance Pending</p>
          <p className="mt-2 text-4xl font-semibold text-slate-900">
            {summary?.maintenance_pending ?? 0}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Maintenance issues waiting for action from the operations team.
          </p>
        </div>
      </section>
    </div>
  );
}
