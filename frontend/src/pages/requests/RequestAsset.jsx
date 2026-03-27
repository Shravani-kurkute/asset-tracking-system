import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Inbox, Send, XCircle } from "lucide-react";
import toast from "react-hot-toast";

import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { ROLES } from "../../utils/roles";

const ADMIN_ROLES = [ROLES.SYSTEM_ADMIN, ROLES.DEPT_ADMIN];

function formatDate(value) {
  if (!value) return "Pending";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function requestStatusClass(status) {
  if (status === "approved") return "status-badge status-approved";
  if (status === "rejected") return "status-badge status-rejected";
  return "status-badge status-pending";
}

export default function RequestAsset() {
  const { user } = useAuth();
  const [assets, setAssets] = useState([]);
  const [requests, setRequests] = useState([]);
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actingRequestId, setActingRequestId] = useState(null);
  const [error, setError] = useState("");

  const isAdmin = ADMIN_ROLES.includes(user?.role);

  const loadRequestData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [assetsResponse, requestsResponse] = await Promise.all([
        api.get(isAdmin ? "/assets" : "/requests/assets"),
        api.get("/requests"),
      ]);

      const assetRows = Array.isArray(assetsResponse.data) ? assetsResponse.data : [];
      const requestRows = Array.isArray(requestsResponse.data) ? requestsResponse.data : [];

      setAssets(assetRows);
      setRequests(requestRows);
    } catch (requestError) {
      setError(
        requestError.response?.data?.detail ||
          "We could not load asset requests right now."
      );
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    loadRequestData();
  }, [loadRequestData]);

  useEffect(() => {
    const handleRefresh = () => {
      loadRequestData();
    };

    window.addEventListener("dataUpdated", handleRefresh);
    return () => window.removeEventListener("dataUpdated", handleRefresh);
  }, [loadRequestData]);

  const availableAssets = useMemo(
    () => assets.filter((asset) => asset.status === "Available"),
    [assets]
  );

  const sortedRequests = useMemo(
    () =>
      [...requests].sort(
        (left, right) =>
          new Date(right.request_date).getTime() - new Date(left.request_date).getTime()
      ),
    [requests]
  );

  const pendingCount = useMemo(
    () => requests.filter((request) => request.status === "pending").length,
    [requests]
  );

  const handleCreateRequest = async (event) => {
    event.preventDefault();

    if (!selectedAssetId) {
      toast.error("Please choose an asset to request.");
      return;
    }

    setSubmitting(true);

    try {
      await api.post("/requests", { asset_id: Number(selectedAssetId) });
      toast.success("Asset request submitted.");
      setSelectedAssetId("");
      await loadRequestData();
      window.dispatchEvent(new Event("dataUpdated"));
      window.dispatchEvent(new Event("notificationsUpdated"));
    } catch (requestError) {
      toast.error(
        requestError.response?.data?.detail || "Unable to submit this request."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecision = async (requestId, decision) => {
    setActingRequestId(requestId);

    try {
      await api.put(`/requests/${requestId}/${decision}`);
      toast.success(
        decision === "approve"
          ? "Request approved and asset assigned."
          : "Request rejected."
      );
      await loadRequestData();
      window.dispatchEvent(new Event("dataUpdated"));
      window.dispatchEvent(new Event("notificationsUpdated"));
    } catch (requestError) {
      toast.error(
        requestError.response?.data?.detail ||
          `Unable to ${decision} this request.`
      );
    } finally {
      setActingRequestId(null);
    }
  };

  if (loading) {
    return (
      <div className="loading-panel">
        <div className="loading-spinner" />
        <h2 className="mt-5 text-xl font-semibold text-slate-900">Loading requests</h2>
        <p className="mt-2 text-sm text-slate-500">
          Fetching available assets and the latest request activity.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error ? <div className="feedback-error">{error}</div> : null}

      <section className={`grid grid-cols-1 gap-6 ${isAdmin ? "xl:grid-cols-[360px_minmax(0,1fr)]" : "xl:grid-cols-[400px_minmax(0,1fr)]"}`}>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="section-title">
                {isAdmin ? "Request Summary" : "Request an Asset"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {isAdmin
                  ? "Review pending approvals and current inventory demand."
                  : "Choose from currently available assets and submit a request."}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100">
              <Inbox className="h-5 w-5 text-sky-700" />
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-sm text-slate-500">
                {isAdmin ? "Pending Requests" : "My Requests"}
              </p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {isAdmin ? pendingCount : requests.length}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-sm text-slate-500">Available Assets</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {availableAssets.length}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-sm text-slate-500">Approved Requests</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {requests.filter((request) => request.status === "approved").length}
              </p>
            </div>
          </div>

          {!isAdmin ? (
            <form onSubmit={handleCreateRequest} className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Select Available Asset
                </label>
                <select
                  value={selectedAssetId}
                  onChange={(event) => setSelectedAssetId(event.target.value)}
                  className="input-field"
                  required
                >
                  <option value="">Choose an asset</option>
                  {availableAssets.map((asset) => (
                    <option
                      key={asset.id}
                      value={asset.id}
                    >
                      {asset.name} ({asset.category}) - {asset.status}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={submitting || !selectedAssetId || !availableAssets.length}
                className="btn-primary inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3"
              >
                {submitting ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {submitting ? "Submitting..." : "Request Asset"}
              </button>
            </form>
          ) : null}
        </div>

        <div className="card overflow-hidden p-0">
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="section-title">
              {isAdmin ? "Request Queue" : "My Request History"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {isAdmin
                ? "Approve or reject incoming requests from employees."
                : "Track pending, approved, and rejected asset requests."}
            </p>
          </div>

          {!sortedRequests.length ? (
            <div className="empty-state">
              <div className="empty-icon">
                <Inbox className="h-7 w-7 text-slate-500" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-slate-900">
                No requests yet
              </h3>
              <p className="mt-2 max-w-md text-sm text-slate-500">
                {isAdmin
                  ? "Incoming asset requests will appear here for review."
                  : "Submit your first request to start the approval workflow."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-50/80">
                  <tr>
                    <th className="table-header">Asset</th>
                    <th className="table-header">Requested By</th>
                    <th className="table-header">Request Date</th>
                    <th className="table-header">Approval Date</th>
                    <th className="table-header">Status</th>
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
                      <td className="table-cell">{formatDate(request.request_date)}</td>
                      <td className="table-cell">{formatDate(request.approval_date)}</td>
                      <td className="table-cell">
                        <span className={requestStatusClass(request.status)}>
                          {request.status}
                        </span>
                      </td>
                      {isAdmin ? (
                        <td className="table-cell">
                          {request.status === "pending" ? (
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => handleDecision(request.id, "approve")}
                                disabled={actingRequestId === request.id}
                                className="btn-secondary inline-flex items-center gap-2 rounded-lg px-3 py-2 text-emerald-700"
                              >
                                {actingRequestId === request.id ? (
                                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                                ) : (
                                  <CheckCircle2 className="h-4 w-4" />
                                )}
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDecision(request.id, "reject")}
                                disabled={actingRequestId === request.id}
                                className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <XCircle className="h-4 w-4" />
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">Completed</span>
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

      {!isAdmin && !availableAssets.length ? (
        <div className="feedback-info">
          No assets are currently available to request. Check back after inventory is returned or added.
        </div>
      ) : null}
    </div>
  );
}
