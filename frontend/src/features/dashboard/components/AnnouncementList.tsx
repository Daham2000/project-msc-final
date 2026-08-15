import { useState } from "react";

import type { Announcement } from "../../../types/api";
import { formatDate } from "../../../utils/format";
import { formatAudienceLabel } from "../utils";
import { AppIcon } from "../../../components/AppIcon";

interface AnnouncementListProps {
  announcements: Announcement[];
  deletingAnnouncementId: string | null;
  isAdmin: boolean;
  onDelete?: (announcementId: string) => void;
}

export function AnnouncementList({
  announcements,
  deletingAnnouncementId,
  isAdmin,
  onDelete,
}: AnnouncementListProps) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  if (!announcements.length) {
    return (
      <div className="empty-state">
        {isAdmin ? "No notices have been published yet." : "There are no notices to display at the moment."}
      </div>
    );
  }

  return (
    <div className="announcement-list">
      {announcements.map((item) => (
        <article
          className={`announcement-card ${item.audience_role === "all" ? "audience-all" : ""}`}
          key={item.id}
        >
          <div className="announcement-meta">
            <span>{formatAudienceLabel(item.audience_role)}</span>
            <small>{formatDate(item.created_at)}</small>
          </div>
          <h3>{item.title}</h3>
          <p>{item.message}</p>
          <footer className="announcement-footer">
            <span>Posted by {item.created_by.full_name}</span>
            {isAdmin && onDelete ? (
              confirmingId === item.id ? (
                <div className="confirm-row">
                  <span className="confirm-row-label">Delete this notice?</span>
                  <button className="ghost-button" type="button" onClick={() => setConfirmingId(null)}>
                    Cancel
                  </button>
                  <button
                    className="danger-button"
                    type="button"
                    disabled={deletingAnnouncementId === item.id}
                    onClick={() => {
                      onDelete(item.id);
                      setConfirmingId(null);
                    }}
                  >
                    {deletingAnnouncementId === item.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              ) : (
                <button
                  className="danger-ghost-button announcement-delete-button"
                  type="button"
                  onClick={() => setConfirmingId(item.id)}
                >
                  <AppIcon name="trash" />
                  Delete
                </button>
              )
            ) : null}
          </footer>
        </article>
      ))}
    </div>
  );
}
