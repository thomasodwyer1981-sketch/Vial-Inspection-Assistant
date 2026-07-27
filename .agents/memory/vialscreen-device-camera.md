---
name: On-device camera constraints and failure visibility
description: getUserMedia resolution cap for Capacitor WebView, burst sizing, and the no-silent-capture-failure rule
---

# On-device camera lessons (PepScan)

## Cap getUserMedia resolution — never request 4K in a Capacitor WebView
**Rule:** Request at most `ideal: 1920×1440` for the live camera stream. Never `ideal: 4096`/full sensor.
**Why:** Phones honor the request and run the full 12MP pipeline inside the WebView — hundreds of MB of memory, whole-device slowdown, and canvas `drawImage`/`toDataURL` frame-grabs start throwing under the memory pressure. Downstream needs make high res pointless anyway: captures are capped at 1600px and the analysis engine samples at 512px.
**How to apply:** Any change to `requestCameraStream` constraints or new capture surfaces must keep the 1920 cap. Test on a real device — desktop webcams never reproduce the pressure.

## Capture failures must be loud
**Rule:** Never `catch {}` around the capture/burst path. On failure: show a visible user message and report via the Sentry helper with a `where` tag.
**Why:** A silently-swallowed burst exception made the shutter look dead ("won't let me capture") with zero diagnostics; the only symptom was user frustration.
**How to apply:** Grep the camera components for bare `catch` blocks when touching capture logic; each needs user feedback + `captureError`.

## Burst sizing
Best-of-3 at ≤1600px is the sweet spot. 5 high-res grabs in ~1.3s caused OOM-adjacent failures on device; sharpness selection gains beyond 3 candidates are marginal. Also guard `video.videoWidth > 0 && readyState >= 2` before grabbing — Android WebView reports 0×0 right after `play()`, which yields empty captures.

## Denied camera permission hangs BOTH capture paths on Android
**Rule:** Every camera acquisition must have a guaranteed-settle timeout and end in a visible error state, never a spinner.
**Why:** When the app *declares* CAMERA but the OS permission is denied (user denial or Android auto-reset after reinstall), WebView `getUserMedia` never settles AND the `<input capture>` chooser intent is blocked (declared-but-denied apps may not use ACTION_IMAGE_CAPTURE) — so both the live path and the fallback hung forever on "Opening camera…" / a spinning disabled button. Phone's own Camera app keeps working, which misleads debugging.
**How to apply:** Keep the 12s getUserMedia timeout (stop late-arriving streams to avoid locking the camera), the error screen with per-error hints (NotAllowedError → Settings→Apps→PepScan→Permissions→Camera), and the visibility-based watchdog on file-chooser paths (if the app never backgrounds within ~7s of `input.click()`, the chooser never opened). First support question for "can't capture": check the app's camera permission in Android settings.

## E2E testing the camera in headless browsers
The testing agent's browser has no camera and can't grant fake devices reliably — `getUserMedia` fails there, which makes it a perfect probe for the failure/error-state UX (it reproduced the silent-hang bug exactly). Don't use it to validate the happy capture path; use it to validate that camera failures are loud and recoverable.
