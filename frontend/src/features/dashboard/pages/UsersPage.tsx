import { Navigate } from "react-router-dom";

import { useAuth } from "../../../auth/AuthContext";
import { AppIcon } from "../../../components/AppIcon";
import { useAppSelector } from "../../../store/hooks";
import { formatShortDate } from "../../../utils/format";

export function UsersPage() {
  const { user } = useAuth();
  const users = useAppSelector((state) => state.dashboard.users);

  if (user?.role !== "admin") {
    return <Navigate replace to="/" />;
  }

  return (
    <div className="panel">
      <div className="panel-title">
        <AppIcon name="users" />
        <div className="panel-title-copy">
          <div className="panel-heading">Registered users</div>
          <p>View the current list of users who can access this service platform.</p>
        </div>
      </div>
      {!users.length ? (
        <div className="empty-state">No user accounts are available to display.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>City</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {users.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.full_name}</td>
                  <td>{entry.email}</td>
                  <td>{entry.role}</td>
                  <td>{entry.profile.city ?? "N/A"}</td>
                  <td>{formatShortDate(entry.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
