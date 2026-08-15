import type { Announcement, AudienceScope, User } from "../../types/api";

export function firstName(value: string) {
  return value.trim().split(/\s+/)[0] ?? value;
}

export function profileStatusLabel(user: User) {
  const details = [user.profile.age, user.profile.gender, user.profile.city, user.profile.phone, user.profile.address];
  const completed = details.filter(Boolean).length;
  return completed >= 3 ? "Profile active" : "Profile details pending";
}

export function formatAudienceLabel(value: Announcement["audience_role"]) {
  return value === "all" ? "All users" : "Citizens";
}

const MAX_LISTED_CITIES = 3;

/** Human-readable reach, e.g. "Island wide" or "Colombo, Kandy +2 more". */
export function formatReachLabel(scope: AudienceScope, cities: string[]) {
  if (scope === "island_wide") {
    return "Island wide";
  }

  if (!cities.length) {
    return "No cities selected yet";
  }

  if (cities.length <= MAX_LISTED_CITIES) {
    return cities.join(", ");
  }

  const shown = cities.slice(0, MAX_LISTED_CITIES).join(", ");
  return `${shown} +${cities.length - MAX_LISTED_CITIES} more`;
}

export function formatFieldLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

export function formatFieldType(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}
