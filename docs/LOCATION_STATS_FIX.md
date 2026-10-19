# Location statistics repair (2026-10-19)

## Cause

All 740 current activity records have an empty `location_country`; 726 have
their own route. COROS import intentionally skips external reverse geocoding
to avoid serial network requests. Both Dashboard location panels previously
relied exclusively on the empty labels, so they always reported zero.

## Repair

- Resolve missing places in the browser using the existing checked-in province
  and world boundaries and each activity's own route start, without sending
  coordinates to a geocoding service or changing the source JSON/database.
- Preserve explicit place metadata; use the same prepared result for profile
  totals, footprint highlighting, and province route filtering.
- Missing/invalid/indoor routes remain unknown, never inherit another
  activity's display fallback. Ocean/unresolved boundary points stay unknown.
- Exclude the unnamed map decoration from the province total: 34, not 35.

The current source resolves to 2 countries and 11 Chinese provincial regions.
These are dynamically calculated, not hardcoded counts. This is a coarse
route-start classification against bundled boundaries, not a list of every
border crossed during an activity.

Verification: nine location regressions plus four existing report contract
tests pass; typecheck, full source ESLint, production build and targeted
formatting checks pass. Browser checks cover matching panel totals, province
selection/clearing, reloads, and responsive layouts.

## Separate report failure

The report request on 2026-10-19 failed before model generation. The production
collector returned HTTP 503 with `COROS_REAUTH_REQUIRED` in
[the failed workflow](https://github.com/coffaye/ayu-running-hub/actions/runs/39183903884).
It requires a fresh browser-authorized production COROS grant via the existing
broker reauthorization procedure, not model or Skill changes. Existing reports
and their manifest are preserved by this repair.
