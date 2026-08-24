/**
 * Unit tests for role-based navigation (features/dashboard/navigation.ts).
 *
 * This is the UI half of the access-control story: the backend rejects an
 * unauthorised call with 403, and this module makes sure a citizen is never
 * shown the admin screens in the first place. Pure functions, so no router and
 * no rendering are involved.
 */

import { describe, expect, it } from "vitest";

import {
  dashboardRoutes,
  getDashboardNavItems,
  getGroupedNavItems,
  getRouteIdForPath,
  getRouteMeta,
  tabDescription,
  tabTitle,
} from "./navigation";

const ADMIN = true;
const CITIZEN = false;

const idsFor = (isAdmin: boolean) => getDashboardNavItems(isAdmin).map((item) => item.id);

describe("getDashboardNavItems", () => {
  it("hides every admin-only screen from a citizen", () => {
    const ids = idsFor(CITIZEN);

    expect(ids).not.toContain("city");
    expect(ids).not.toContain("users");
    expect(ids).not.toContain("broadcast");
  });

  it("shows the administration screens to an admin", () => {
    const ids = idsFor(ADMIN);

    expect(ids).toEqual(expect.arrayContaining(["city", "users", "broadcast"]));
  });

  it("hides the citizen-only profile screen from an admin", () => {
    expect(idsFor(ADMIN)).not.toContain("profile");
    expect(idsFor(CITIZEN)).toContain("profile");
  });

  it("gives both roles the shared screens", () => {
    for (const ids of [idsFor(ADMIN), idsFor(CITIZEN)]) {
      expect(ids).toEqual(expect.arrayContaining(["overview", "citizen", "announcements"]));
    }
  });

  it("relabels the shared prediction screen per role", () => {
    const adminItem = getDashboardNavItems(ADMIN).find((item) => item.id === "citizen");
    const citizenItem = getDashboardNavItems(CITIZEN).find((item) => item.id === "citizen");

    expect(adminItem?.label).toBe("Assessment");
    expect(citizenItem?.label).toBe("Guidance");
  });

  it("does not mutate the shared route definitions when relabelling", () => {
    getDashboardNavItems(ADMIN);
    const source = dashboardRoutes.find((route) => route.id === "citizen");

    expect(source?.label).toBe("Guidance");
  });

  it("every route carries a unique path", () => {
    const paths = dashboardRoutes.map((route) => route.path);

    expect(new Set(paths).size).toBe(paths.length);
  });
});

describe("getGroupedNavItems", () => {
  it("gives an admin both sidebar groups", () => {
    const groups = getGroupedNavItems(ADMIN).map((entry) => entry.group);

    expect(groups).toEqual(["Workspace", "Administration"]);
  });

  it("drops the empty Administration group for a citizen", () => {
    const groups = getGroupedNavItems(CITIZEN).map((entry) => entry.group);

    expect(groups).toEqual(["Workspace"]);
  });

  it("never renders a group with no items", () => {
    for (const isAdmin of [ADMIN, CITIZEN]) {
      for (const entry of getGroupedNavItems(isAdmin)) {
        expect(entry.items.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("getRouteIdForPath", () => {
  it("resolves a known path to its route id", () => {
    expect(getRouteIdForPath("/")).toBe("overview");
    expect(getRouteIdForPath("/broadcast")).toBe("broadcast");
  });

  it("falls back to the overview for an unknown path", () => {
    expect(getRouteIdForPath("/does-not-exist")).toBe("overview");
  });
});

describe("getRouteMeta", () => {
  it("returns the matching item for a permitted route", () => {
    expect(getRouteMeta("users", ADMIN).label).toBe("Users");
  });

  it("falls back to the overview when a citizen requests an admin route", () => {
    // Deep-linking to /users as a citizen must not crash the layout.
    expect(getRouteMeta("users", CITIZEN).id).toBe("overview");
  });
});

describe("tab copy", () => {
  it("phrases the overview differently for each role", () => {
    expect(tabTitle("overview", ADMIN)).toBe("Sustainability overview");
    expect(tabTitle("overview", CITIZEN)).toBe("Citizen overview");
  });

  it("gives every route a non-empty title and description", () => {
    for (const route of dashboardRoutes) {
      for (const isAdmin of [ADMIN, CITIZEN]) {
        expect(tabTitle(route.id, isAdmin).length).toBeGreaterThan(0);
        expect(tabDescription(route.id, isAdmin).length).toBeGreaterThan(0);
      }
    }
  });
});
