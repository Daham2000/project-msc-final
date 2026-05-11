import { AppIcon, type AppIconName } from "../../../components/AppIcon";

interface RecommendationBlockProps {
  icon: AppIconName;
  title: string;
  items: string[];
}

export function RecommendationBlock({ icon, title, items }: RecommendationBlockProps) {
  return (
    <section className="recommendation-block">
      <div className="panel-title compact">
        <AppIcon name={icon} />
        <div className="panel-title-copy">
          <h3>{title}</h3>
        </div>
      </div>
      {items.length ? (
        <ul className="idea-list">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <div className="empty-state">No guidance is available for this section yet.</div>
      )}
    </section>
  );
}
