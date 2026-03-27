// Notification inbox page for request decisions, alerts, and maintenance updates.

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import toast from "react-hot-toast";

import api from "../../api/axios";

function formatDateTime(value) {
  if (!value) return "Just now";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function notificationBadgeClass(type) {
  if (type === "asset_request") return "status-badge status-pending";
  if (type === "maintenance_update") return "status-badge status-in-progress";
  if (type === "return_reminder") return "status-badge status-assigned";
  return "status-badge status-available";
}

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [markingAll, setMarkingAll] = useState(false);
  const [activeId, setActiveId] = useState(null);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/notifications");
      setNotifications(Array.isArray(response.data) ? response.data : []);
    } catch (requestError) {
      setError(
        requestError.response?.data?.detail ||
          "We could not load notifications right now."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    const handleRefresh = () => {
      loadNotifications();
    };

    window.addEventListener("notificationsUpdated", handleRefresh);
    return () => window.removeEventListener("notificationsUpdated", handleRefresh);
  }, [loadNotifications]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.is_read).length,
    [notifications]
  );

  const markAsRead = async (notificationId) => {
    setActiveId(notificationId);

    try {
      await api.put(`/notifications/${notificationId}/read`);
      await loadNotifications();
      window.dispatchEvent(new Event("notificationsUpdated"));
    } catch (requestError) {
      toast.error(
        requestError.response?.data?.detail ||
          "Unable to mark the notification as read."
      );
    } finally {
      setActiveId(null);
    }
  };

  const markAllRead = async () => {
    setMarkingAll(true);

    try {
      await api.put("/notifications/read-all");
      await loadNotifications();
      window.dispatchEvent(new Event("notificationsUpdated"));
      toast.success("All notifications marked as read.");
    } catch (requestError) {
      toast.error(
        requestError.response?.data?.detail ||
          "Unable to mark all notifications as read."
      );
    } finally {
      setMarkingAll(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-panel">
        <div className="loading-spinner" />
        <h2 className="mt-5 text-xl font-semibold text-slate-900">
          Loading notifications
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Fetching your latest alerts and updates.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error ? <div className="feedback-error">{error}</div> : null}

      <section className="card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="section-title">Inbox</h2>
            <p className="mt-1 text-sm text-slate-500">
              Review request decisions, maintenance updates, and system alerts.
            </p>
          </div>

          <button
            type="button"
            onClick={markAllRead}
            disabled={markingAll || !unreadCount}
            className="btn-secondary inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3"
          >
            <CheckCheck className="h-4 w-4" />
            {markingAll ? "Marking..." : "Mark All Read"}
          </button>
        </div>
      </section>

      <section className="card overflow-hidden p-0">
        <div className="border-b border-slate-100 px-6 py-5">
          <h2 className="section-title">Notifications</h2>
          <p className="mt-1 text-sm text-slate-500">
            {unreadCount} unread notification{unreadCount === 1 ? "" : "s"}
          </p>
        </div>

        {!notifications.length ? (
          <div className="empty-state">
            <div className="empty-icon">
              <Bell className="h-7 w-7 text-slate-500" />
            </div>
            <h3 className="mt-5 text-lg font-semibold text-slate-900">
              No notifications yet
            </h3>
            <p className="mt-2 max-w-md text-sm text-slate-500">
              Important updates will appear here as your requests and maintenance
              workflows progress.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-start lg:justify-between ${
                  notification.is_read ? "bg-white" : "bg-sky-50/50"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-base font-semibold text-slate-900">
                      {notification.title}
                    </h3>
                    <span className={notificationBadgeClass(notification.type)}>
                      {notification.type.replace("_", " ")}
                    </span>
                    {!notification.is_read ? (
                      <span className="badge badge-blue">Unread</span>
                    ) : null}
                  </div>
                  <p className="text-sm text-slate-600">{notification.message}</p>
                  <p className="text-xs text-slate-400">
                    {formatDateTime(notification.created_at)}
                  </p>
                </div>

                {!notification.is_read ? (
                  <button
                    type="button"
                    onClick={() => markAsRead(notification.id)}
                    disabled={activeId === notification.id}
                    className="btn-secondary inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3"
                  >
                    <CheckCheck className="h-4 w-4" />
                    {activeId === notification.id ? "Saving..." : "Mark Read"}
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
