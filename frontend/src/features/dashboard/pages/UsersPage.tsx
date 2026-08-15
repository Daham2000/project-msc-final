import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "../../../auth/AuthContext";
import { AppIcon } from "../../../components/AppIcon";
import { useAppSelector } from "../../../store/hooks";
import type { User } from "../../../types/api";
import { formatShortDate } from "../../../utils/format";

function initialsOf(fullName: string) {
  return fullName
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function UsersPage() {
  const { user } = useAuth();
  const users = useAppSelector((state) => state.dashboard.users);
  const [query, setQuery] = useState("");

  if (user?.role !== "admin") {
    return <Navigate replace to="/" />;
  }

  const filtered = useFilteredUsers(users, query);

  return (
    <div className="panel">
      <div className="section-header">
        <div className="panel-title">
          <AppIcon name="users" />
          <div className="panel-title-copy">
            <div className="panel-heading">Registered users · {users.length}</div>
            <p>View the current list of users who can access this service platform.</p>
          </div>
        </div>
        <div className="search-field">
          <AppIcon name="search" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name or email"
          />
        </div>
      </div>
      {!filtered.length ? (
        <div className="empty-state">No user accounts match your search.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>City</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => (
                <tr key={entry.id}>
                  <td>
                    <div className="user-cell">
                      <span className="avatar" aria-hidden="true">
                        {initialsOf(entry.full_name)}
                      </span>
                      <div>
                        <div className="user-cell-name">{entry.full_name}</div>
                        <div className="user-cell-email">{entry.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`role-badge ${entry.role === "admin" ? "admin" : ""}`}>
                      {entry.role === "admin" ? "Admin" : "Citizen"}
                    </span>
                  </td>
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

function useFilteredUsers(users: User[], query: string) {
  return useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return users;
    }
    return users.filter(
      (entry) => entry.full_name.toLowerCase().includes(q) || entry.email.toLowerCase().includes(q)
    );
  }, [users, query]);
}
