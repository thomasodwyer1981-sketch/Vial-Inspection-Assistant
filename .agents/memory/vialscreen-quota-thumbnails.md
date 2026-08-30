---
name: VialScreen localStorage quota & thumbnails
description: Storage budgets, proactive legacy repair, and orphan cleanup rules for reliable on-device inspection saving
---

## The rule

Never store full-resolution capture dataUrls in the shared history key. Generate small thumbnails at capture time, enforce both per-thumbnail and per-session byte budgets, and strip full `dataUrl` values before persistence.

**Why:** localStorage quota is ~5 MB total. Full base64 captures are 200 KB–2 MB each; a single scan's images could exceed the whole quota, and the history key is one JSON blob — one oversized item breaks saving for everything.

**How to apply:**
- Any new capture path (camera, file fallback) must generate and pass `thumbDataUrl` with the capture.
- UI components (`MediaPreview`, detail screens) must fall back to `thumbDataUrl` when `dataUrl` is empty — old records and lean sessions have no full image.
- Repair legacy history/session values before the first final-save attempt. WKWebView may reject even a smaller replacement while already at quota, so oversized values must be removed before compact rewrites.
- Size the aggregate budget for the full 100-record retention window, including duplicate thumbnails in detail records and the History index; a generous per-image cap can exceed quota in aggregate.
- Preserve the actual non-sensitive save-failure stage/category on a pending active session so recovery guidance remains accurate after an app restart.
- `addToHistory` slices history to 100 items; anything sliced off MUST also have its `vialscreen:session:<id>` record removed, or orphaned session blobs accumulate and silently eat the quota.
- Backup import (`importExportPayload`) must resolve the retained-after-cap set BEFORE writing anything: history commits first (quota throw = clean abort), session records are written only for retained imports, and cap-dropped ids get their session records pruned. Reported counts reflect what actually survived the cap.
- If WKWebView rejects a compact finalized-record write while PepScan-owned `localStorage` is nearly empty, persist the compact detail, History index, and pending active result through IndexedDB and hydrate that fallback before rendering. **Why:** a physical iOS 26 device returned `QuotaExceededError` with only 93 PepScan-owned characters stored, proving cleanup alone cannot repair every Web Storage failure.
