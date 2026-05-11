import type { Announcement } from "../../../types/api";
import { formatDate } from "../../../utils/format";
import { formatAudienceLabel } from "../utils";

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
        <article className="announcement-card" key={item.id}>
          <div className="announcement-meta">
            <span>{formatAudienceLabel(item.audience_role)}</span>
            <small>{formatDate(item.created_at)}</small>
          </div>
          <h3>{item.title}</h3>
          <p>{item.message}</p>
          <footer className="announcement-footer">
            <span>Posted by {item.created_by.full_name}</span>
            {isAdmin && onDelete ? (
              <button
                className="ghost-button announcement-delete-button"
                disabled={deletingAnnouncementId === item.id}
                type="button"
                onClick={() => onDelete(item.id)}
              >
                {deletingAnnouncementId === item.id ? "Deleting..." : "Delete"}
              </button>
            ) : null}
          </footer>
        </article>
      ))}
    </div>
  );
}
