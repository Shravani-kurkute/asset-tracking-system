// Reusable table for showing recent assignment activity on the dashboard.

import { ClipboardList } from "lucide-react";

const statusClasses = {
  Available: "status-badge status-available",
  Assigned: "status-badge status-assigned",
  Maintenance: "status-badge status-maintenance",
  Returned: "status-badge status-returned",
};

function formatDate(value) {
  if (!value) return "Not returned";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default function ActivityTable({
  assignments,
  isEmployee = false,
  showMockAction = false,
  onSeedDemoData,
}) {
  if (!assignments.length) {
    return (
      <div className="card flex min-h-72 flex-col items-center justify-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
          <ClipboardList className="h-7 w-7 text-slate-500" />
        </div>
        <h3 className="mt-5 text-lg font-semibold text-slate-900">No data available</h3>
        <p className="mt-2 max-w-md text-sm text-slate-500">
          Assignment activity will appear here once assets start moving through the
          system.
        </p>
        {showMockAction ? (
          <button
            type="button"
            onClick={onSeedDemoData}
            className="btn-secondary mt-5 px-4 py-2"
          >
            Load Demo Data
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="card overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
        <div>
          <h3 className="section-title">Recent Activity</h3>
          <p className="mt-1 text-sm text-slate-500">
            Latest assignment updates from the tracking system.
          </p>
        </div>
        <span className="badge badge-blue">{assignments.length} records</span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-50/80">
            <tr>
              <th className="table-header">Asset</th>
              <th className="table-header">{isEmployee ? "Issued To" : "Assigned To"}</th>
              <th className="table-header">Assigned Date</th>
              <th className="table-header">Status</th>
              <th className="table-header">Return Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {assignments.map((assignment) => {
              const derivedStatus = assignment.return_date
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
                        {assignment.user?.full_name || "Unknown user"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {assignment.user?.email || "No email"}
                      </p>
                    </div>
                  </td>
                  <td className="table-cell">{formatDate(assignment.assigned_date)}</td>
                  <td className="table-cell">
                    <span
                      className={
                        statusClasses[derivedStatus] || "status-badge status-returned"
                      }
                    >
                      {derivedStatus}
                    </span>
                  </td>
                  <td className="table-cell">{formatDate(assignment.return_date)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
