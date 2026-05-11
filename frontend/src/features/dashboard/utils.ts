import type { Announcement, User } from "../../types/api";

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

export function formatFieldLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

export function formatFieldType(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}
