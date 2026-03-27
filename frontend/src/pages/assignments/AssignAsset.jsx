// Admin workflow for assigning available assets and reviewing assignment history.

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Send, UserRoundPlus } from "lucide-react";
import toast from "react-hot-toast";

import api from "../../api/axios";

function todayAsInputValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = `${today.getMonth() + 1}`.padStart(2, "0");
  const day = `${today.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value) {
  if (!value) return "Not returned";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default function AssignAsset() {
  const [assets, setAssets] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [users, setUsers] = useState([]);
  const [supportsUserDropdown, setSupportsUserDropdown] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [userLookupError, setUserLookupError] = useState("");
  const [form, setForm] = useState({
    asset_id: "",
    user_id: "",
    assigned_date: todayAsInputValue(),
  });

  const loadAssignPageData = useCallback(async () => {
    setLoading(true);
    setError("");
    setUserLookupError("");

    try {
      const [assetsResponse, assignmentsResponse] = await Promise.all([
        api.get("/assets"),
        api.get("/assignments"),
      ]);

      setAssets(Array.isArray(assetsResponse.data) ? assetsResponse.data : []);
      setAssignments(Array.isArray(assignmentsResponse.data) ? assignmentsResponse.data : []);

      try {
        const usersResponse = await api.get("/users");
        setUsers(Array.isArray(usersResponse.data) ? usersResponse.data : []);
        setSupportsUserDropdown(true);
      } catch (usersError) {
        setUsers([]);
        setSupportsUserDropdown(false);
        setUserLookupError(
          usersError.response?.status === 404
            ? "User list API is not available yet. Enter a user ID manually."
            : "Could not load users automatically. Enter a user ID manually."
        );
      }
    } catch (requestError) {
      setError(
        requestError.response?.data?.detail ||
          "We could not load assets and assignment history."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAssignPageData();
  }, [loadAssignPageData]);

  useEffect(() => {
    const handleRefresh = () => {
      loadAssignPageData();
    };

    window.addEventListener("dataUpdated", handleRefresh);
    return () => window.removeEventListener("dataUpdated", handleRefresh);
  }, [loadAssignPageData]);

  const availableAssets = useMemo(
    () => assets.filter((asset) => asset.status === "Available"),
    [assets]
  );

  const assignmentRows = useMemo(
    () =>
      [...assignments].sort(
        (left, right) =>
          new Date(right.assigned_date).getTime() -
          new Date(left.assigned_date).getTime()
      ),
    [assignments]
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const resetForm = () => {
    setForm({
      asset_id: "",
      user_id: "",
      assigned_date: todayAsInputValue(),
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.asset_id || !form.user_id || !form.assigned_date) {
      toast.error("Please fill in all assignment fields.");
      return;
    }

    setSubmitting(true);

    try {
      await api.post("/assign", {
        asset_id: Number(form.asset_id),
        user_id: Number(form.user_id),
        assigned_date: form.assigned_date,
      });

      toast.success("Asset assigned successfully.");
      resetForm();
      await loadAssignPageData();
      window.dispatchEvent(new Event("dataUpdated"));
      window.dispatchEvent(new Event("notificationsUpdated"));
    } catch (requestError) {
      toast.error(
        requestError.response?.data?.detail || "Unable to assign this asset."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {loading ? (
        <div className="loading-panel">
          <div className="loading-spinner" />
          <h2 className="mt-5 text-xl font-semibold text-slate-900">
            Loading assignment tools
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Fetching available assets and recent assignment history.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={loadAssignPageData}
              className="btn-secondary inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {error ? (
            <div className="feedback-error">{error}</div>
          ) : null}

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="section-title">Assign Asset</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Available assets only. Assigned items stay disabled.
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100">
                  <Send className="h-5 w-5 text-sky-700" />
                </div>
              </div>

              <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Select Asset
                  </label>
                  <select
                    name="asset_id"
                    value={form.asset_id}
                    onChange={handleChange}
                    className="input-field"
                    required
                  >
                    <option value="">Choose an available asset</option>
                    {assets.map((asset) => (
                      <option
                        key={asset.id}
                        value={asset.id}
                        disabled={asset.status !== "Available"}
                      >
                        {asset.name} ({asset.category}) - {asset.status}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-slate-500">
                    Available now: {availableAssets.length} asset
                    {availableAssets.length === 1 ? "" : "s"}
                  </p>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Assign To
                  </label>
                  {supportsUserDropdown && users.length ? (
                    <select
                      name="user_id"
                      value={form.user_id}
                      onChange={handleChange}
                      className="input-field"
                      required
                    >
                      <option value="">Choose a user</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.full_name} ({user.email}) - ID {user.id}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div>
                      <input
                        type="number"
                        min="1"
                        name="user_id"
                        value={form.user_id}
                        onChange={handleChange}
                        className="input-field"
                        placeholder="Enter user ID"
                        required
                      />
                      <p className="mt-2 text-xs text-amber-700">
                        {userLookupError || "Enter the user ID manually."}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Assigned Date
                  </label>
                  <input
                    type="date"
                    name="assigned_date"
                    value={form.assigned_date}
                    onChange={handleChange}
                    className="input-field"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={
                    submitting ||
                    !availableAssets.length ||
                    !form.asset_id ||
                    !form.user_id ||
                    !form.assigned_date
                  }
                  className="btn-primary inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3"
                >
                  {submitting ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <UserRoundPlus className="h-4 w-4" />
                  )}
                  {submitting ? "Assigning..." : "Assign Asset"}
                </button>
              </form>
            </div>

            <div className="card bg-gradient-to-br from-sky-50 to-white">
              <h2 className="section-title">Assignment Summary</h2>
              <p className="mt-1 text-sm text-slate-500">
                Keep handovers clean by issuing only available devices and recording
                the exact assignment date.
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-sky-100 bg-white p-4">
                  <p className="text-sm text-slate-500">Available Assets</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">
                    {availableAssets.length}
                  </p>
                </div>
                <div className="rounded-2xl border border-sky-100 bg-white p-4">
                  <p className="text-sm text-slate-500">Assignment Records</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">
                    {assignments.length}
                  </p>
                </div>
                <div className="rounded-2xl border border-sky-100 bg-white p-4">
                  <p className="text-sm text-slate-500">Open Handovers</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">
                    {assignments.filter((assignment) => !assignment.return_date).length}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="card overflow-hidden p-0">
            <div className="border-b border-slate-100 px-6 py-5">
              <h2 className="section-title">Assignment History</h2>
              <p className="mt-1 text-sm text-slate-500">
                Review recent handovers, returned assets, and currently active issues.
              </p>
            </div>

            {!assignmentRows.length ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <Send className="h-7 w-7 text-slate-500" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-slate-900">
                  No assignments yet
                </h3>
                <p className="mt-2 max-w-md text-sm text-slate-500">
                  The assignment history table will populate as soon as assets are
                  issued to users.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-50/80">
                    <tr>
                      <th className="table-header">Asset Name</th>
                      <th className="table-header">Assigned To</th>
                      <th className="table-header">Assigned Date</th>
                      <th className="table-header">Return Date</th>
                      <th className="table-header">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {assignmentRows.map((assignment) => {
                      const status = assignment.return_date
                        ? "Returned"
                        : assignment.asset?.status || "Assigned";

                      return (
                        <tr key={assignment.id} className="table-row">
                          <td className="table-cell">
                            <div>
                              <p className="font-medium text-slate-900">
                                {assignment.asset?.name || "Unknown asset"}
                              </p>
                              <p className="text-xs text-slate-500">
                                {assignment.asset?.category || "Uncategorized"}
                              </p>
                            </div>
                          </td>
                          <td className="table-cell">
                            <div>
                              <p className="font-medium text-slate-900">
                                {assignment.user?.full_name || `User #${assignment.user_id}`}
                              </p>
                              <p className="text-xs text-slate-500">
                                {assignment.user?.email || "Manual user entry"}
                              </p>
                            </div>
                          </td>
                          <td className="table-cell">{formatDate(assignment.assigned_date)}</td>
                          <td className="table-cell">{formatDate(assignment.return_date)}</td>
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
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
