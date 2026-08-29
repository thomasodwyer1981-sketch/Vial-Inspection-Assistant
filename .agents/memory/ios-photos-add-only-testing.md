---
name: iOS Photos add-only testing
description: Why exact Photos asset verification must stay outside the add-only app process.
---

An iOS app granted Photos `.addOnly` access can create assets but cannot query
the library afterward to count or inspect them. Keep automated tests responsible
for proving the add-only request, one writer invocation, denial behavior, and a
successful native write result. Confirm that exactly one image visibly appears
from the Photos app during the release-device smoke pass.

**Why:** Reading the library back from the app would require broader
`.readWrite` authorization and would stop the test from representing the
privacy-preserving add-only production flow.

**How to apply:** Any future Photos release check should reset authorization,
accept the add-only prompt, run the write once, and use the Photos app—not an
in-app fetch—to confirm the resulting asset.