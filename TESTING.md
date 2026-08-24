# Testing Guide

Unit tests for the Smart City Sustainability Dashboard — 116 tests across the
backend (Python / pytest) and the frontend (TypeScript / Vitest).

| Layer | Runner | Files | Tests |
|---|---|---|---|
| Backend | pytest | 3 | 70 |
| Frontend | Vitest | 3 | 46 |
| **Total** | | **6** | **116** |

All tests are **unit** tests: they exercise pure logic in isolation. Nothing here
starts a web server, connects to MongoDB, reads the CSV dataset, or renders a
React component, so the whole suite runs in under three seconds.

---

## 1. Prerequisites

You need the backend virtual environment and the frontend packages installed.
Both are one-time steps.

### Backend

```bash
python -m venv .venv
```

Activate it — **PowerShell**:

```bash
.venv\Scripts\Activate.ps1
```

Then install the runtime and test dependencies:

```bash
pip install -r requirements-dev.txt
```

`requirements-dev.txt` pulls in `requirements.txt` and adds `pytest`.

### Frontend

```bash
cd frontend
```

```bash
npm install
```

This installs `vitest` along with the application packages.

---

## 2. Running the tests

### Backend — all tests

From the **project root**, with the virtual environment active:

```bash
python -m pytest
```

Expected output:

```
tests/test_user_model.py ..............                                  [ 20%]
tests/test_ml_models.py  ...............................                 [ 64%]
tests/test_domain_model.py .........................                     [100%]

============================= 70 passed in 2.03s ==============================
```

Configuration lives in [pytest.ini](pytest.ini) — it points at `tests/` and turns
on verbose output, so no flags are needed.

### Frontend — all tests

From the **`frontend/` folder**:

```bash
npm test
```

Expected output:

```
 ✓ src/features/dashboard/utils.test.ts          (12 tests)
 ✓ src/features/dashboard/navigation.test.ts     (16 tests)
 ✓ src/features/dashboard/dashboardSlice.test.ts (18 tests)

 Test Files  3 passed (3)
      Tests  46 passed (46)
```

### Both, from a clean shell

```bash
python -m pytest && cd frontend && npm test && cd ..
```

---

## 3. Useful variations

### Backend

Run one file:

```bash
python -m pytest tests/test_ml_models.py
```

Run one class or one test:

```bash
python -m pytest tests/test_domain_model.py::TestCarbonFootprint
```

```bash
python -m pytest -k "ev_charging"
```

Quiet summary only:

```bash
python -m pytest -q
```

Stop at the first failure, with local variables printed:

```bash
python -m pytest -x -l
```

### Frontend

Watch mode — re-runs automatically as you edit:

```bash
npm run test:watch
```

Run one file:

```bash
npx vitest run src/features/dashboard/navigation.test.ts
```

Filter by test name:

```bash
npx vitest run -t "duplicate"
```

---

## 4. What each file covers

### Backend — `tests/`

#### `test_user_model.py` — 14 tests

The `User` database model ([app/models/user.py](app/models/user.py)). The most
important assertions are about credential safety.

| Group | Covers |
|---|---|
| `TestUserCreate` | password hashing, salt uniqueness, email lower-casing, name trimming, role validation |
| `TestUserSerialisation` | `to_dict()` excludes the password hash, `to_document()` keeps it, ISO dates, sparse profiles, document round-trip |
| `TestUserRoles` | admin detection, blank-city fallback used by notice targeting |

Key test:

```python
def test_to_dict_never_exposes_the_password_hash(self):
    """The API response path must not leak credentials."""
    payload = make_user().to_dict()

    assert "password_hash" not in payload
```

#### `test_ml_models.py` — 31 tests

The machine-learning layer ([app/ml/](app/ml)). Uses synthetic data with a known
answer, so correctness is provable rather than approximate.

| Group | Covers |
|---|---|
| `TestFeatureEncoder` | intercept placement, standardisation, one-hot encoding, zero-variance safety, unseen categories |
| `TestRidgeRegressor` | exact recovery of `y = 3 + 2x`, penalty shrinkage, unpenalised intercept |
| `TestKnnRegressor` | exact-match neighbours, distance weighting |
| `TestMetrics` | MAE / RMSE / R², empty-input safety, API rounding |
| `TestTrainTestSplit` | 80/20 ratio, seed determinism, **no train/test leakage** |
| `TestTrainedRegressionModel` | fit → algorithm selection → predict, transport effect learned |
| `TestLinearSolver` | known system solved, singular matrix rejected |

Key test:

```python
def test_train_and_test_sets_do_not_overlap(self):
    train_ids = {row["i"] for row in train}
    test_ids = {row["i"] for row in test}

    assert train_ids.isdisjoint(test_ids)   # no data leakage
```

#### `test_domain_model.py` — 25 tests

The emission equations ([app/ml/domain_model.py](app/ml/domain_model.py)) that
make every prediction physically defensible.

| Group | Covers |
|---|---|
| `TestTimeBudget` | away/home hour split, 24-hour clamp, missing columns |
| `TestDistance` | step conversion, commute scaling, walkers have no vehicle distance, never negative |
| `TestHomeEnergy` | component sum, EV home vs public charging |
| `TestTransportCarbon` | zero-emission modes, published factors, **mode ordering**, unknown-mode fallback |
| `TestCarbonFootprint` | full footprint formula, **EV energy never double-counted**, override clamping |

Key tests:

```python
def test_modes_rank_in_the_physically_correct_order(self):
    """The defect this module was written to fix: mode must matter."""
    assert walking < transit < motorbike < car


def test_ev_charging_is_never_counted_twice(self):
    """Charging at home bills the kWh to the household; charging publicly bills
    it to transport. Either way the citizen's total footprint is identical."""
    assert carbon_footprint_kg(at_home) == pytest.approx(carbon_footprint_kg(in_public))
```

### Frontend — `frontend/src/features/dashboard/`

#### `utils.test.ts` — 12 tests

Display helpers ([utils.ts](frontend/src/features/dashboard/utils.ts)), chiefly
`formatReachLabel` — the UI mirror of the backend's audience-scope rules.

```typescript
it("ignores a stray city list on an island-wide notice", () => {
  // The backend clears `cities` for island-wide notices; the UI must agree
  // even if an older document still carries one.
  expect(formatReachLabel("island_wide", ["Colombo", "Kandy"])).toBe("Island wide");
});
```

Also covers `profileStatusLabel`, `firstName`, `formatAudienceLabel`, and
`formatFieldLabel`.

#### `navigation.test.ts` — 16 tests

Role-based menu filtering
([navigation.ts](frontend/src/features/dashboard/navigation.ts)) — the UI half of
access control. The backend returns 403 for an unauthorised call; this module
makes sure a citizen never sees the admin screens at all.

```typescript
it("hides every admin-only screen from a citizen", () => {
  const ids = idsFor(CITIZEN);

  expect(ids).not.toContain("city");
  expect(ids).not.toContain("users");
  expect(ids).not.toContain("broadcast");
});

it("falls back to the overview when a citizen requests an admin route", () => {
  // Deep-linking to /users as a citizen must not crash the layout.
  expect(getRouteMeta("users", CITIZEN).id).toBe("overview");
});
```

#### `dashboardSlice.test.ts` — 18 tests

The Redux reducer
([dashboardSlice.ts](frontend/src/features/dashboard/dashboardSlice.ts)). A
reducer is a pure `(state, action) => state` function, so the tests dispatch
plain action objects — no store is created and no network call is made.

| Group | Covers |
|---|---|
| initial state | empty/idle defaults, seeded city planner |
| `receiveAnnouncement` | newest-first ordering, **duplicate guard**, stream cursor |
| city planner forms | add with sequential id, remove by index, isolated update |
| loading lifecycle | pending/rejected transitions, per-section busy flags |
| delete / publish | pending row tracking, list removal, form reset |
| resetting | error clearing vs full logout wipe |

Key test:

```typescript
it("ignores a duplicate id so a reconnecting stream cannot double-post", () => {
  // The SSE endpoint replays from `since_id`; without this guard a dropped
  // connection would show the same notice twice.
  const withOne = reducer(initialState(), receiveAnnouncement(makeAnnouncement("a")));
  const again = reducer(withOne, receiveAnnouncement(makeAnnouncement("a")));

  expect(again.announcements).toHaveLength(1);
});
```

---

## 5. Mutation checks

Passing tests only prove something if they can also fail. Each suite was
verified by deliberately breaking the code it covers, confirming the failure,
then reverting.

| Mutation | Suite | Result |
|---|---|---|
| Add `password_hash` to `User.to_dict()` | `test_user_model.py` | 1 failed, 13 passed |
| Penalise the intercept (`range(1, …)` → `range(0, …)`) | `test_ml_models.py` | 1 failed, 30 passed |
| Count home-charged EV energy twice | `test_domain_model.py` | 1 failed, 24 passed |
| `MAX_LISTED_CITIES` 3 → 2 | `utils.test.ts` | 2 failed, 10 passed |
| Stop hiding admin-only screens from citizens | `navigation.test.ts` | 3 failed, 13 passed |
| Remove the SSE duplicate guard | `dashboardSlice.test.ts` | 1 failed, 17 passed |

Every mutation was caught by the test written for it, and all files were
restored afterwards.

To reproduce one, for example the EV invariant:

```bash
python -m pytest tests/test_domain_model.py -k ev_charging -v
```

Then edit `transport_carbon_kg` in [app/ml/domain_model.py](app/ml/domain_model.py)
so `public_kwh` no longer subtracts `home_charged_ev_kwh(row)`, re-run, and
observe the failure before undoing the change.

---

## 6. Adding a new test

**Backend** — create `tests/test_<module>.py`. Pytest discovers `test_*.py`
files, `Test*` classes, and `test_*` functions automatically; no registration is
needed. Import from `app.` as usual — the project root is on the path because
`pytest.ini` sets the rootdir.

**Frontend** — create a `*.test.ts` file next to the module it covers. Vitest
discovers it automatically. Import `{ describe, expect, it } from "vitest"`.

Keep new tests **unit**-scoped where possible: prefer a pure function or a
reducer over anything that needs a running server.

---

## 7. Troubleshooting

**`No module named pytest`** — the virtual environment is not active, or
`requirements-dev.txt` was never installed. Activate `.venv` and re-run the pip
install.

**`ModuleNotFoundError: No module named 'app'`** — run pytest from the project
root, not from inside `tests/`.

**`vitest: not found`** — run `npm install` inside `frontend/`.

**Frontend tests pass but `npm run build` fails** — the build runs `tsc -b`
across `src/`, which type-checks the `.test.ts` files too. Fix the type error;
the test files are excluded from the production bundle but not from type
checking.

---

## 8. What is *not* covered

Being explicit about scope, since these are unit tests only:

- **No API integration tests.** The endpoints are not exercised against a live
  MongoDB. `app.test_client()` would be the natural tool if this is added later.
- **No React component rendering.** Components are untested; adding
  `@testing-library/react` and `jsdom` would enable that.
- **No end-to-end tests.** No browser-driven journey through login → prediction →
  notice.
- **No coverage reporting.** `pytest-cov` and `vitest --coverage` would produce
  percentage figures if required.

The current suites deliberately target the parts where a silent regression would
be most damaging: credential handling, the ML algorithms, the emission physics,
role-based access, and live-stream state.
