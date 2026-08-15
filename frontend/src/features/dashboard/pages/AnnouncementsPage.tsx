import { useAuth } from "../../../auth/AuthContext";
import { AppIcon } from "../../../components/AppIcon";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { AnnouncementList } from "../components/AnnouncementList";
import { deleteAnnouncement } from "../dashboardSlice";

export function AnnouncementsPage() {
  const { token, user } = useAuth();
  const dispatch = useAppDispatch();
  const { announcements, deletingAnnouncementId } = useAppSelector((state) => state.dashboard);
  const isAdmin = user?.role === "admin";

  const handleAnnouncementDelete = async (announcementId: string) => {
    if (!token) {
      return;
    }

    await dispatch(deleteAnnouncement({ token, announcementId })).unwrap().catch(() => undefined);
  };

  return (
    <div className="panel">
      <div className="panel-title">
        <AppIcon name="notice" />
        <div className="panel-title-copy">
          <div className="panel-heading">{isAdmin ? "Published notices" : "Official service notices"}</div>
          <p>
            {isAdmin
              ? "Review notices that have been published for citizens and service teams."
              : "Stay informed about sustainability programs, public updates, and local authority announcements."}
          </p>
        </div>
      </div>
      <AnnouncementList
        announcements={announcements}
        deletingAnnouncementId={deletingAnnouncementId}
        isAdmin={isAdmin}
        onDelete={isAdmin ? handleAnnouncementDelete : undefined}
      />
    </div>
  );
}
