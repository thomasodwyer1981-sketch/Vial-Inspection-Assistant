---
name: VialScreen localStorage quota & thumbnails
description: Why history stores 144px thumbnails, and how pruning must clean up orphaned session records
---

## The rule

Never store full-resolution capture dataUrls in the shared history key. History items carry a 144px `thumbDataUrl` generated at accept-time (`generateThumbnail`, best-effort); session records strip `dataUrl` to `''` before persisting.

**Why:** localStorage quota is ~5 MB total. Full base64 captures are 200 KB–2 MB each; a single scan's images could exceed the whole quota, and the history key is one JSON blob — one oversized item breaks saving for everything.

**How to apply:**
- Any new capture path (camera, file fallback) must generate and pass `thumbDataUrl` with the capture.
- UI components (`MediaPreview`, detail screens) must fall back to `thumbDataUrl` when `dataUrl` is empty — old records and lean sessions have no full image.
- `addToHistory` slices history to 100 items; anything sliced off MUST also have its `vialscreen:session:<id>` record removed, or orphaned session blobs accumulate and silently eat the quota.
- Backup import (`importExportPayload`) must resolve the retained-after-cap set BEFORE writing anything: history commits first (quota throw = clean abort), session records are written only for retained imports, and cap-dropped ids get their session records pruned. Reported counts reflect what actually survived the cap.
