import type { SVGProps } from "react";

export type AppIconName =
  | "leaf"
  | "overview"
  | "profile"
  | "guidance"
  | "city"
  | "notice"
  | "data"
  | "users"
  | "broadcast"
  | "logout"
  | "energy"
  | "carbon"
  | "transport"
  | "calendar"
  | "shield"
  | "spark"
  | "location"
  | "mail"
  | "phone"
  | "search"
  | "trash"
  | "check"
  | "plus"
  | "trendUp"
  | "trendDown";

type AppIconProps = SVGProps<SVGSVGElement> & {
  name: AppIconName;
};

export function AppIcon({ name, ...props }: AppIconProps) {
  switch (name) {
    case "leaf":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" {...props}>
          <path d="M18.5 5.5c-5.3-.3-9 1.2-11.3 3.7-2.7 2.9-3 7.2-.7 9.5 2.3 2.3 6.6 2 9.5-.7 2.5-2.3 4-6 3.7-11.3Z" />
          <path d="M7 17c2.1-2.1 4.6-3.9 7.5-5.2" />
        </svg>
      );
    case "overview":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" {...props}>
          <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
          <rect x="13.5" y="3.5" width="7" height="4.5" rx="2" />
          <rect x="13.5" y="10.5" width="7" height="10" rx="2" />
          <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
        </svg>
      );
    case "profile":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" {...props}>
          <path d="M12 12a4.25 4.25 0 1 0 0-8.5 4.25 4.25 0 0 0 0 8.5Z" />
          <path d="M4 20a8 8 0 0 1 16 0" />
        </svg>
      );
    case "guidance":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" {...props}>
          <path d="M12 3.5 4.5 7v5.4c0 4.2 2.8 8.1 7.5 9.8 4.7-1.7 7.5-5.6 7.5-9.8V7L12 3.5Z" />
          <path d="m9.2 12.2 1.8 1.8 3.8-4.3" />
        </svg>
      );
    case "city":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" {...props}>
          <path d="M4 20.5h16" />
          <path d="M6 20.5v-9l5-2.2v11.2" />
          <path d="M13 20.5V4.5l5 2.4v13.6" />
          <path d="M8.5 13.5h.01M8.5 16.5h.01M15.5 10.5h.01M15.5 13.5h.01" />
        </svg>
      );
    case "notice":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" {...props}>
          <path d="M6 9.5a6 6 0 1 1 12 0v3.2l1.5 2.8H4.5l1.5-2.8V9.5Z" />
          <path d="M10 18.5a2 2 0 0 0 4 0" />
        </svg>
      );
    case "data":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" {...props}>
          <ellipse cx="12" cy="6" rx="7" ry="2.5" />
          <path d="M5 6v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6" />
          <path d="M5 12v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-6" />
        </svg>
      );
    case "users":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" {...props}>
          <path d="M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
          <path d="M15.5 12.5a3 3 0 1 0 0-6" />
          <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
          <path d="M14 17.5a4.5 4.5 0 0 1 6.5 1.5" />
        </svg>
      );
    case "broadcast":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" {...props}>
          <path d="m4 13 10-4.5v7L4 11v2Z" />
          <path d="M14 9.5 18.5 8v8L14 14.5" />
          <path d="M6.5 13.5 8 19h3l-1.1-4.1" />
        </svg>
      );
    case "logout":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" {...props}>
          <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
          <path d="M10 17 15 12l-5-5" />
          <path d="M15 12H4" />
        </svg>
      );
    case "energy":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" {...props}>
          <path d="M13.5 2.5 6 13h5l-1 8.5L18 11h-5l.5-8.5Z" />
        </svg>
      );
    case "carbon":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" {...props}>
          <path d="M7.5 14.5A4.5 4.5 0 1 1 12 9a5.5 5.5 0 1 1 4.5 8.7H8.2A3.7 3.7 0 0 1 7.5 14.5Z" />
        </svg>
      );
    case "transport":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" {...props}>
          <path d="M5 14.5h14l-1-6a2 2 0 0 0-2-1.6H8a2 2 0 0 0-2 1.6l-1 6Z" />
          <path d="M7.5 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM16.5 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
        </svg>
      );
    case "calendar":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" {...props}>
          <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
          <path d="M7.5 3.5v3M16.5 3.5v3M3.5 9h17" />
        </svg>
      );
    case "shield":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" {...props}>
          <path d="M12 3.5 4.5 7v5.4c0 4.2 2.8 8.1 7.5 9.8 4.7-1.7 7.5-5.6 7.5-9.8V7L12 3.5Z" />
        </svg>
      );
    case "spark":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" {...props}>
          <path d="m12 2 1.8 5.7L19.5 9l-5.7 1.3L12 16l-1.8-5.7L4.5 9l5.7-1.3L12 2Z" />
          <path d="m18 15 .8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8L18 15ZM6 15l.8 2.2L9 18l-2.2.8L6 21l-.8-2.2L3 18l2.2-.8L6 15Z" />
        </svg>
      );
    case "location":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" {...props}>
          <path d="M12 20.5s6-5.3 6-10a6 6 0 1 0-12 0c0 4.7 6 10 6 10Z" />
          <path d="M12 12.5a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z" />
        </svg>
      );
    case "mail":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" {...props}>
          <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
          <path d="m5.5 8 6.5 5 6.5-5" />
        </svg>
      );
    case "phone":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" {...props}>
          <path d="M7.8 4.5h2.6l1.1 4-1.8 1.7a14 14 0 0 0 4.1 4.1l1.7-1.8 4 1.1v2.6c0 .8-.6 1.5-1.4 1.5A13.9 13.9 0 0 1 4.5 5.9c0-.8.7-1.4 1.5-1.4Z" />
        </svg>
      );
    case "search":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" {...props}>
          <circle cx="10.5" cy="10.5" r="7" />
          <path d="m20.5 20.5-4.35-4.35" />
        </svg>
      );
    case "trash":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" {...props}>
          <path d="M5 7h14" />
          <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          <path d="m7 7 1 13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-13" />
        </svg>
      );
    case "check":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" {...props}>
          <path d="m5 12.5 4.5 4.5L19 7" />
        </svg>
      );
    case "plus":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" {...props}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case "trendUp":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" {...props}>
          <path d="M4 16 10 10 14 14 20 7" />
          <path d="M14 6h6v6" />
        </svg>
      );
    case "trendDown":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" {...props}>
          <path d="M4 8 10 14 14 10 20 17" />
          <path d="M14 18h6v-6" />
        </svg>
      );
    default:
      return null;
  }
}
