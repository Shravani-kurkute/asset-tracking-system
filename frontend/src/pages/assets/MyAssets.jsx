import { useCallback, useEffect, useMemo, useState } from "react";
import { PackageOpen, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";

import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { ROLES } from "../../utils/roles";

const ADMIN_ROLES = [ROLES.SYSTEM_ADMIN, ROLES.DEPT_ADMIN];

function formatDate(value) {
  if (!value) return "Not returned";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default function MyAssets() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [returningAssetId, setReturningAssetId] = useState(null);

  const isAdmin = ADMIN_ROLES.includes(user?.role);

  const loadMyAssets = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/assignments");
      const allAssignments = Array.isArray(response.data) ? response.data : [];
      const myAssignments = allAssignments.filter(
        (assignment) => assignment.user_id === user?.id
      );

      setAssignments(
        myAssignments.sort(
          (left, right) =>
            new Date(right.assigned_date).getTime() -
            new Date(left.assigned_date).getTime()
        )
      );
    } catch (requestError) {
      setError(
        requestError.response?.data?.detail ||
          "We could not load your assigned assets."
      );
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    loadMyAssets();
  }, [loadMyAssets, user?.id]);

  useEffect(() => {
    const handleRefresh = () => {
      if (user?.id) {
        loadMyAssets();
      }
    };

    window.addEventListener("dataUpdated", handleRefresh);
    return () => window.removeEventListener("dataUpdated", handleRefresh);
  }, [loadMyAssets, user?.id]);

  const activeAssignments = useMemo(
    () => assignments.filter((assignment) => !assignment.return_date),
    [assignments]
  );

  const handleReturnAsset = async (assignment) => {
    if (!assignment?.asset_id) return;

    setReturningAssetId(assignment.asset_id);

    try {
      await api.put(`/assets/${assignment.asset_id}`, {
        status: "Available",
        return_date: new Date().toISOString().slice(0, 10),
      });

      toast.success("Asset marked as returned.");
      await loadMyAssets();
      window.dispatchEvent(new Event("dataUpdated"));
    } catch (requestError) {
      toast.error(
        requestError.response?.data?.detail || "Unable to return this asset."
      );
    } finally {
      setReturningAssetId(null);
    }
  };

  if (loading) {
    return (
      <div className="loading-panel">
        <div className="loading-spinner" />
        <h2 className="mt-5 text-xl font-semibold text-slate-900">Loading my assets</h2>
        <p className="mt-2 text-sm text-slate-500">
          Fetching assignments mapped to your account.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="feedback-error">{error}</div>
      ) : null}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="card">
          <p className="text-sm text-slate-500">Total Assignment Records</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {assignments.length}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Active Assets</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {activeAssignments.length}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Returned Assets</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {assignments.filter((assignment) => assignment.return_date).length}
          </p>
        </div>
      </section>

      <section className="card overflow-hidden p-0">
        <div className="border-b border-slate-100 px-6 py-5">
          <h2 className="section-title">My Assets</h2>
          <p className="mt-1 text-sm text-slate-500">
            Review all assets currently assigned to you and your recent return history.
          </p>
        </div>

        {!assignments.length ? (
          <div className="empty-state">
            <div className="empty-icon">
              <PackageOpen className="h-7 w-7 text-slate-500" />
            </div>
            <h3 className="mt-5 text-lg font-semibold text-slate-900">
              No assets assigned
            </h3>
            <p className="mt-2 max-w-md text-sm text-slate-500">
              Once an asset is issued to your account, it will appear here with its
              assignment history.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50/80">
                <tr>
                  <th className="table-header">Asset Name</th>
                  <th className="table-header">Category</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Assigned Date</th>
                  <th className="table-header">Return Date</th>
                  <th className="table-header">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assignments.map((assignment) => {
                  const status = assignment.return_date
                    ? "Returned"
                    : assignment.asset?.status || "Assigned";
                  const canReturn =
                    isAdmin && !assignment.return_date && assignment.asset_id;

                  return (
                    <tr key={assignment.id} className="table-row">
                      <td className="table-cell font-medium text-slate-900">
                        {assignment.asset?.name || "Unknown asset"}
                      </td>
                      <td className="table-cell">
                        {assignment.asset?.category || "Uncategorized"}
                      </td>
                      <td className="table-cell">
                        <span
                          className={
                            status === "Returned"
                              ? "status-badge status-returned"
                              : status === "Assigned"
                                ? "status-badge status-assigned"
                                : status === "Maintenance"
                                  ? "status-badge status-maintenance"
                                  : "status-badge status-available"
                          }
                        >
                          {status}
                        </span>
                      </td>
                      <td className="table-cell">{formatDate(assignment.assigned_date)}</td>
                      <td className="table-cell">{formatDate(assignment.return_date)}</td>
                      <td className="table-cell">
                        {canReturn ? (
                          <button
                            type="button"
                            onClick={() => handleReturnAsset(assignment)}
                            disabled={returningAssetId === assignment.asset_id}
                            className="btn-secondary inline-flex items-center gap-2 rounded-lg px-3 py-2"
                          >
                            {returningAssetId === assignment.asset_id ? (
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-transparent" />
                            ) : (
                              <RotateCcw className="h-4 w-4" />
                            )}
                            Return Asset
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">
                            {assignment.return_date
                              ? "Completed"
                              : "Admin-only action"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
