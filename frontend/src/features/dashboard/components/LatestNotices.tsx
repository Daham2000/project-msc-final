import type { Announcement } from "../../../types/api";
import { formatShortDate } from "../../../utils/format";
import { formatAudienceLabel } from "../utils";

interface LatestNoticesProps {
  announcements: Announcement[];
  emptyMessage: string;
}

export function LatestNotices({ announcements, emptyMessage }: LatestNoticesProps) {
  if (!announcements.length) {
    return <div className="empty-state">{emptyMessage}</div>;
  }

  return (
    <div className="announcement-list">
      {announcements.slice(0, 3).map((item) => (
        <article className="announcement-card" key={item.id}>
          <div className="announcement-meta">
            <span>{formatAudienceLabel(item.audience_role)}</span>
            <small>{formatShortDate(item.created_at)}</small>
          </div>
          <h3>{item.title}</h3>
          <p>{item.message}</p>
        </article>
      ))}
    </div>
  );
}
