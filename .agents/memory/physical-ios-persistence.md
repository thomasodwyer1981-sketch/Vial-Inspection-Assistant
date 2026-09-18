---
name: Physical iOS persistence validation
description: Why storage fallbacks must be verified on the affected iPhone across an app upgrade and relaunch
---

**Rule:** Treat a successful iOS simulator smoke test as necessary but insufficient for persistence fixes. Validate the affected physical device by upgrading in place, saving a real inspection, checking History and its detail screen, then force-closing and relaunching before declaring the fix effective.

**Why:** WKWebView storage behavior can differ from the simulator, and the original failure only appeared on the affected iPhone. A record visible immediately after saving is not proof that the persisted detail survives an app restart.

**How to apply:** Pair release-build simulator/liveness checks with a physical-device acceptance pass and correlate the result with the save-failure diagnostic stream.