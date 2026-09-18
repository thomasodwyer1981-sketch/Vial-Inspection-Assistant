---
name: Label OCR intelligence
description: Safety boundary for extracting label metadata and comparing printed names
---

Structured label intelligence must be derived only from explicit, readable OCR text. User-entered metadata may provide context for comparison, but it must never fill a missing lot, expiry, manufacturer, volume, or concentration value.

**Why:** A guessed label value could be mistaken for a printed fact. The product is a visual screen, not an identity, purity, potency, authenticity, or safety verifier.

**How to apply:** Keep missing fields visibly unavailable, use educational wording for printed-name mismatches, and preserve the raw OCR text needed to reopen the same Pro result from saved history.