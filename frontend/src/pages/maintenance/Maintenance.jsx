// Maintenance page for reporting issues and tracking maintenance progress.

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Wrench, Zap } from "lucide-react";
import toast from "react-hot-toast";

import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { ROLES } from "../../utils/roles";

const ADMIN_ROLES = [ROLES.SYSTEM_ADMIN, ROLES.DEPT_ADMIN];

function formatDateTime(value) {
  if (!value) return "Not updated";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusClass(status) {
  if (status === "in_progress") return "status-badge status-in-progress";
  if (status === "completed") return "status-badge status-completed";
  return "status-badge status-pending";
}

export default function Maintenance() {
  console.log("Maintenance rendering");

  const { user } = useAuth();
  const [assets, setAssets] = useState([]);
  const [requests, setRequests] = useState([]);
  const [form, setForm] = useState({ asset_id: "", issue_description: "" });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actingRequestId, setActingRequestId] = useState(null);
  const [error, setError] = useState("");

  const isAdmin = ADMIN_ROLES.includes(user?.role);

  const loadMaintenanceData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [assetsResponse, maintenanceResponse] = await Promise.all([
        api.get("/assets"),
        api.get("/maintenance"),
      ]);

      setAssets(Array.isArray(assetsResponse.data) ? assetsResponse.data : []);
      setRequests(Array.isArray(maintenanceResponse.data) ? maintenanceResponse.data : []);
    } catch (requestError) {
      setError(
        requestError.response?.data?.detail ||
          "We could not load maintenance data right now."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMaintenanceData();
  }, [loadMaintenanceData]);

  useEffect(() => {
    const handleRefresh = () => {
      loadMaintenanceData();
    };

    window.addEventListener("dataUpdated", handleRefresh);
    return () => window.removeEventListener("dataUpdated", handleRefresh);
  }, [loadMaintenanceData]);

  const assignedAssets = useMemo(
    () => assets.filter((asset) => asset.status === "Assigned"),
    [assets]
  );

  const sortedRequests = useMemo(
    () =>
      [...requests].sort(
        (left, right) =>
          new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
      ),
    [requests]
  );

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.asset_id || !form.issue_description.trim()) {
      toast.error("Please choose an asset and describe the issue.");
      return;
    }

    setSubmitting(true);

    try {
      await api.post("/maintenance", {
        asset_id: Number(form.asset_id),
        issue_description: form.issue_description.trim(),
      });

      toast.success("Maintenance issue reported.");
      setForm({ asset_id: "", issue_description: "" });
      await loadMaintenanceData();
      window.dispatchEvent(new Event("dataUpdated"));
      window.dispatchEvent(new Event("notificationsUpdated"));
    } catch (requestError) {
      toast.error(
        requestError.response?.data?.detail ||
          "Unable to submit the maintenance request."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (requestId, status) => {
    setActingRequestId(requestId);

    try {
      await api.put(`/maintenance/${requestId}/status`, { status });
      toast.success(
        status === "completed"
          ? "Maintenance marked as completed."
          : "Maintenance is now in progress."
      );
      await loadMaintenanceData();
      window.dispatchEvent(new Event("dataUpdated"));
      window.dispatchEvent(new Event("notificationsUpdated"));
    } catch (requestError) {
      toast.error(
        requestError.response?.data?.detail ||
          "Unable to update maintenance status."
      );
    } finally {
      setActingRequestId(null);
    }
  };

  if (loading) {
    return (
      <div className="loading-panel">
        <div className="loading-spinner" />
        <h2 className="mt-5 text-xl font-semibold text-slate-900">
          Loading maintenance
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Fetching reported issues and eligible assets.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error ? <div className="feedback-error">{error}</div> : null}

      <section className={`grid grid-cols-1 gap-6 ${isAdmin ? "xl:grid-cols-1" : "xl:grid-cols-[380px_minmax(0,1fr)]"}`}>
        {!isAdmin ? (
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="section-title">Report Issue</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Raise a maintenance request for an asset currently assigned to you.
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100">
                <AlertTriangle className="h-5 w-5 text-amber-700" />
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Assigned Asset
                </label>
                <select
                  value={form.asset_id}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, asset_id: event.target.value }))
                  }
                  className="input-field"
                  required
                >
                  <option value="">Choose an assigned asset</option>
                  {assignedAssets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.name} ({asset.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Issue Description
                </label>
                <textarea
                  value={form.issue_description}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      issue_description: event.target.value,
                    }))
                  }
                  className="input-field min-h-32 resize-none"
                  placeholder="Describe the issue with this asset"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={
                  submitting || !form.asset_id || !form.issue_description.trim()
                }
                className="btn-primary inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3"
              >
                {submitting ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Wrench className="h-4 w-4" />
                )}
                {submitting ? "Submitting..." : "Submit Request"}
              </button>
            </form>
          </div>
        ) : null}

        <div className="card overflow-hidden p-0">
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="section-title">
              {isAdmin ? "Maintenance Queue" : "My Maintenance Requests"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {isAdmin
                ? "Track reported issues and progress them through resolution."
                : "Review the status of issues you have reported."}
            </p>
          </div>

          {!sortedRequests.length ? (
            <div className="empty-state">
              <div className="empty-icon">
                <Wrench className="h-7 w-7 text-slate-500" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-slate-900">
                No maintenance requests yet
              </h3>
              <p className="mt-2 max-w-md text-sm text-slate-500">
                {isAdmin
                  ? "Reported issues will appear here as soon as users flag them."
                  : "You have not reported any maintenance issues yet."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-50/80">
                  <tr>
                    <th className="table-header">Asset</th>
                    <th className="table-header">User</th>
                    <th className="table-header">Issue</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">Updated</th>
                    {isAdmin ? <th className="table-header">Actions</th> : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedRequests.map((request) => (
                    <tr key={request.id} className="table-row">
                      <td className="table-cell">
                        <div>
                          <p className="font-medium text-slate-900">
                            {request.asset?.name || "Unknown asset"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {request.asset?.category || "Uncategorized"}
                          </p>
                        </div>
                      </td>
                      <td className="table-cell">
                        <div>
                          <p className="font-medium text-slate-900">
                            {request.user?.full_name || `User #${request.user_id}`}
                          </p>
                          <p className="text-xs text-slate-500">
                            {request.user?.email || "No email available"}
                          </p>
                        </div>
                      </td>
                      <td className="table-cell max-w-sm">
                        <p className="whitespace-normal break-words">
                          {request.issue_description}
                        </p>
                      </td>
                      <td className="table-cell">
                        <span className={statusClass(request.status)}>
                          {request.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="table-cell">{formatDateTime(request.updated_at)}</td>
                      {isAdmin ? (
                        <td className="table-cell">
                          {request.status !== "completed" ? (
                            <div className="flex flex-wrap gap-2">
                              {request.status === "pending" ? (
                                <button
                                  type="button"
                                  onClick={() => updateStatus(request.id, "in_progress")}
                                  disabled={actingRequestId === request.id}
                                  className="btn-secondary inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sky-700"
                                >
                                  <Zap className="h-4 w-4" />
                                  In Progress
                                </button>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => updateStatus(request.id, "completed")}
                                disabled={actingRequestId === request.id}
                                className="btn-secondary inline-flex items-center gap-2 rounded-lg px-3 py-2 text-emerald-700"
                              >
                                {actingRequestId === request.id ? (
                                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                                ) : (
                                  <CheckCircle2 className="h-4 w-4" />
                                )}
                                Completed
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">Resolved</span>
                          )}
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {!isAdmin && !assignedAssets.length ? (
        <div className="feedback-info">
          No assigned assets are available for maintenance reporting right now.
        </div>
      ) : null}
    </div>
  );
}
