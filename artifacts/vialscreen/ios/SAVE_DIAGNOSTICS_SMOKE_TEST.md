# iOS save-diagnostics release smoke check

Run this check against the release candidate on a physical iPhone. A development
Vite build intentionally disables Sentry, so it cannot prove delivery.

## Setup

1. Build the iOS release with `VITE_SENTRY_DSN` set to the PepScan client DSN.
2. Confirm the release uses Sentry organization `peptilog` and project `pepscan`.
3. Install the release candidate on a physical iPhone.
4. Fill PepScan's local storage until the final inspection save fails. The
   existing inspection-record quota fixture documents the storage shape if a
   repeatable test payload is needed.

## Verify

1. Complete an inspection and tap the final save action.
2. Wait for the "Scan could not be saved" banner. PepScan waits up to two
   seconds for the Sentry queue before enabling the banner's retry and
   navigation actions.
3. In Sentry, open `peptilog/pepscan` and search for:
   `message:"Inspection record save failed"`.
4. Confirm the event arrived from the release candidate and contains:
   - `save.stage`: `detail` or `history`
   - `save.kind`: `quota`, `serialization`, or `write`
   - `error_name`
   - `app.version`
   - `app.build`
   - `pepscan_storage_chars`
   - `platform`: `ios`
5. Confirm the event timestamp precedes any retry or navigation action.

## Pass criteria

The check passes only when the event is visible in `peptilog/pepscan` with all
fields above. A screenshot of the app banner alone is not sufficient evidence.