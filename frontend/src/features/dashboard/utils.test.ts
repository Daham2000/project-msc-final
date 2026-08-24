/**
 * Unit tests for the dashboard display helpers (features/dashboard/utils.ts).
 *
 * These are pure functions, so no React rendering, router, or store is needed.
 * `formatReachLabel` is the important one: it is the citizen-facing mirror of
 * the backend audience-scope rules in app/models/enums.py.
 */

import { describe, expect, it } from "vitest";

import { firstName, formatAudienceLabel, formatFieldLabel, formatReachLabel, profileStatusLabel } from "./utils";
import type { User } from "../../types/api";

function makeUser(profile: Partial<User["profile"]> = {}): User {
  return {
    id: "1",
    full_name: "Nimal Perera",
    email: "nimal@example.com",
    role: "citizen",
    profile,
    created_at: "2026-08-22T08:44:48.911006+00:00",
    last_login_at: null,
  } as User;
}

describe("formatReachLabel", () => {
  it("reports island-wide notices without listing any city", () => {
    expect(formatReachLabel("island_wide", [])).toBe("Island wide");
  });

  it("ignores a stray city list on an island-wide notice", () => {
    // The backend clears `cities` for island-wide notices; the UI must agree
    // even if an older document still carries one.
    expect(formatReachLabel("island_wide", ["Colombo", "Kandy"])).toBe("Island wide");
  });

  it("warns the admin when a city-scoped notice has no cities yet", () => {
    expect(formatReachLabel("cities", [])).toBe("No cities selected yet");
  });

  it("lists every city up to the three-city limit", () => {
    expect(formatReachLabel("cities", ["Colombo"])).toBe("Colombo");
    expect(formatReachLabel("cities", ["Colombo", "Kandy", "Galle"])).toBe("Colombo, Kandy, Galle");
  });

  it("truncates longer lists with an accurate remaining count", () => {
    const cities = ["Colombo", "Kandy", "Galle", "Jaffna", "Matara"];

    expect(formatReachLabel("cities", cities)).toBe("Colombo, Kandy, Galle +2 more");
  });
});

describe("profileStatusLabel", () => {
  it("marks a profile active once at least three details are filled", () => {
    const user = makeUser({ age: 34, gender: "Male", city: "Colombo" });

    expect(profileStatusLabel(user)).toBe("Profile active");
  });

  it("marks a profile pending when fewer than three details exist", () => {
    const user = makeUser({ city: "Colombo", phone: "0771234567" });

    expect(profileStatusLabel(user)).toBe("Profile details pending");
  });

  it("does not count empty strings as completed details", () => {
    const user = makeUser({ age: 34, gender: "", city: "", phone: "", address: "" });

    expect(profileStatusLabel(user)).toBe("Profile details pending");
  });
});

describe("firstName", () => {
  it("returns the first word of a full name", () => {
    expect(firstName("Nimal Perera")).toBe("Nimal");
  });

  it("handles padding and repeated spaces", () => {
    expect(firstName("   Nimal   Perera  ")).toBe("Nimal");
  });
});

describe("formatAudienceLabel", () => {
  it("translates the stored audience codes into readable text", () => {
    expect(formatAudienceLabel("all")).toBe("All users");
    expect(formatAudienceLabel("citizen")).toBe("Citizens");
  });
});

describe("formatFieldLabel", () => {
  it("turns a snake_case API field into a form label", () => {
    expect(formatFieldLabel("Home_Energy_Consumption_kWh")).toBe("Home Energy Consumption KWh");
    expect(formatFieldLabel("Mode_of_Transport")).toBe("Mode Of Transport");
  });
});
