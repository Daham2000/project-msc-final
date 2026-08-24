/**
 * Unit tests for the dashboard Redux reducer (features/dashboard/dashboardSlice.ts).
 *
 * A reducer is a pure `(state, action) => state` function, so these tests
 * dispatch plain action objects directly. No component is rendered, no store is
 * created, and no network call is made — the async thunks are only used for
 * their generated `.pending` / `.fulfilled` / `.rejected` action creators.
 */

import { describe, expect, it } from "vitest";

import reducer, {
  addCityCitizen,
  clearDashboardError,
  createAnnouncement,
  deleteAnnouncement,
  loadDashboardData,
  predictCitizen,
  receiveAnnouncement,
  removeCityCitizen,
  resetDashboard,
  setCitizenResultView,
  updateCityCitizen,
} from "./dashboardSlice";
import { defaultCitizenForm } from "./constants";
import type { Announcement } from "../../types/api";

/** The reducer's own initial state, obtained the way Redux Toolkit does. */
function initialState() {
  return reducer(undefined, { type: "@@INIT" });
}

function makeAnnouncement(id: string, title = `Notice ${id}`): Announcement {
  return {
    id,
    title,
    message: "Scheduled water supply interruption.",
    audience_role: "citizen",
    audience_scope: "island_wide",
    cities: [],
    created_at: "2026-08-22T08:44:30.750711+00:00",
    expires_at: "2026-08-29T08:44:30.750711+00:00",
    created_by: {
      id: "admin-1",
      full_name: "Local Government Admin",
      email: "admin@smartcity.local",
      role: "admin",
    },
  };
}

describe("initial state", () => {
  it("starts empty and idle", () => {
    const state = initialState();

    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.announcements).toEqual([]);
    expect(state.citizenResult).toBeNull();
    expect(state.busySection).toBeNull();
  });

  it("seeds the city planner with two contrasting citizens", () => {
    const state = initialState();

    expect(state.cityForms).toHaveLength(2);
    expect(state.cityForms[1].Mode_of_Transport).toBe("Public Transport");
  });
});

describe("receiveAnnouncement (live SSE stream)", () => {
  it("puts a newly streamed notice at the top of the list", () => {
    const withOne = reducer(initialState(), receiveAnnouncement(makeAnnouncement("a")));
    const withTwo = reducer(withOne, receiveAnnouncement(makeAnnouncement("b")));

    expect(withTwo.announcements.map((item) => item.id)).toEqual(["b", "a"]);
  });

  it("ignores a duplicate id so a reconnecting stream cannot double-post", () => {
    // The SSE endpoint replays from `since_id`; without this guard a dropped
    // connection would show the same notice twice.
    const withOne = reducer(initialState(), receiveAnnouncement(makeAnnouncement("a")));
    const again = reducer(withOne, receiveAnnouncement(makeAnnouncement("a")));

    expect(again.announcements).toHaveLength(1);
  });

  it("advances the stream cursor to the newest notice", () => {
    const state = reducer(initialState(), receiveAnnouncement(makeAnnouncement("a")));

    expect(state.announcementStreamSinceId).toBe("a");
  });
});

describe("city planner forms", () => {
  it("adds a citizen with the next sequential reference id", () => {
    const state = reducer(initialState(), addCityCitizen());

    expect(state.cityForms).toHaveLength(3);
    expect(state.cityForms[2].Citizen_ID).toBe(3);
  });

  it("removes the citizen at the given index and keeps the rest", () => {
    const state = reducer(initialState(), removeCityCitizen(0));

    expect(state.cityForms).toHaveLength(1);
    expect(state.cityForms[0].Mode_of_Transport).toBe("Public Transport");
  });

  it("updates one citizen without touching the others", () => {
    const edited = { ...defaultCitizenForm(), Age: 65, Mode_of_Transport: "Car" as const };
    const state = reducer(initialState(), updateCityCitizen({ index: 0, value: edited }));

    expect(state.cityForms[0].Age).toBe(65);
    expect(state.cityForms[1].Age).toBe(30);
  });
});

describe("loading lifecycle", () => {
  it("sets loading and clears any previous error while fetching", () => {
    const failed = { ...initialState(), error: "Old failure" };
    const state = reducer(failed, loadDashboardData.pending("req-1", { token: "t", isAdmin: false }));

    expect(state.loading).toBe(true);
    expect(state.error).toBeNull();
  });

  it("stores the rejection message and stops loading on failure", () => {
    const action = loadDashboardData.rejected(
      new Error("boom"),
      "req-1",
      { token: "t", isAdmin: false },
      "Unable to load service information."
    );
    const state = reducer(initialState(), action);

    expect(state.loading).toBe(false);
    expect(state.error).toBe("Unable to load service information.");
  });

  it("marks only the citizen section busy during a prediction", () => {
    const state = reducer(
      initialState(),
      predictCitizen.pending("req-1", { token: "t", form: defaultCitizenForm() })
    );

    expect(state.busySection).toBe("citizen");
  });

  it("clears the busy flag when a prediction fails", () => {
    const busy = { ...initialState(), busySection: "citizen" as const };
    const action = predictCitizen.rejected(
      new Error("boom"),
      "req-1",
      { token: "t", form: defaultCitizenForm() },
      "We could not prepare your guidance right now."
    );

    expect(reducer(busy, action).busySection).toBeNull();
  });
});

describe("deleting a notice", () => {
  it("tracks which notice is being deleted so only its row shows a spinner", () => {
    const action = deleteAnnouncement.pending("req-1", { token: "t", announcementId: "a" });
    const state = reducer(initialState(), action);

    expect(state.deletingAnnouncementId).toBe("a");
  });

  it("removes the deleted notice and clears the pending flag", () => {
    const seeded = {
      ...initialState(),
      announcements: [makeAnnouncement("a"), makeAnnouncement("b")],
      deletingAnnouncementId: "a",
    };
    const action = deleteAnnouncement.fulfilled("a", "req-1", { token: "t", announcementId: "a" });
    const state = reducer(seeded, action);

    expect(state.announcements.map((item) => item.id)).toEqual(["b"]);
    expect(state.deletingAnnouncementId).toBeNull();
  });
});

describe("publishing a notice", () => {
  it("clears the compose form once the notice is published", () => {
    const filled = {
      ...initialState(),
      announcementForm: {
        title: "Water cut",
        message: "Tomorrow 9am-3pm",
        audience_role: "citizen" as const,
        audience_scope: "cities" as const,
        cities: ["Colombo"],
      },
    };
    const action = createAnnouncement.fulfilled([makeAnnouncement("a")], "req-1", {
      token: "t",
      payload: filled.announcementForm,
    });
    const state = reducer(filled, action);

    expect(state.announcementForm.title).toBe("");
    expect(state.announcementForm.cities).toEqual([]);
    expect(state.announcements).toHaveLength(1);
  });
});

describe("resetting", () => {
  it("clears a single error without discarding loaded data", () => {
    const dirty = {
      ...initialState(),
      error: "Something failed",
      announcements: [makeAnnouncement("a")],
    };
    const state = reducer(dirty, clearDashboardError());

    expect(state.error).toBeNull();
    expect(state.announcements).toHaveLength(1);
  });

  it("wipes everything on logout so the next user sees no stale data", () => {
    const dirty = {
      ...initialState(),
      announcements: [makeAnnouncement("a")],
      users: [{ id: "1" } as never],
      error: "Something failed",
      citizenResultView: "recommendations" as const,
    };
    const state = reducer(dirty, resetDashboard());

    expect(state).toEqual(initialState());
  });

  it("switches the result tab without clearing the result", () => {
    const state = reducer(initialState(), setCitizenResultView("recommendations"));

    expect(state.citizenResultView).toBe("recommendations");
  });
});
