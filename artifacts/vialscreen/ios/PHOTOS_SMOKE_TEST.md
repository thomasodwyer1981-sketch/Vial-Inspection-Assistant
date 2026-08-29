# iOS Photos release smoke check

Run this check on the release candidate with a physical iPhone when possible.
The Photos permission state is stored outside the app's local inspection record,
so the permission must be reset between the allowed and denied passes.

## Automated native checks

From a macOS machine with Xcode installed:

```sh
xcodebuild \
  -project ios/App/App.xcodeproj \
  -scheme App \
  -destination 'platform=iOS Simulator,name=iPhone 16 Pro' \
  -only-testing:AppTests/PepScanPhotosPluginTests \
  test
```

`testFirstUseRequestsAddOnlyAndSavesExactlyOnceWhenAllowed` verifies that a
first-use request is made with `.addOnly` and that the writer is called once.
`testDeniedPermissionDoesNotWriteToPhotos` verifies the denied branch never
mutates Photos.

## Device/simulator pass

1. Install the release candidate with a clean Photos permission state. On a
   simulator, reset it with:

   ```sh
   xcrun simctl privacy booted reset photos com.pepscan.app
   ```

2. Open PepScan, complete one inspection, and open **Share → Save to Photos**.
3. Accept the **Add Photos Only** prompt. Open Photos and search for the
   `pepscan-*.png` result card. Exactly one new PNG must be present.
4. Repeat the inspection without changing its saved record, reset the Photos
   permission, deny the prompt, and tap **Save to Photos** again.
5. PepScan must show: “Photos access is off. Open Settings → PepScan → Photos
   and allow adding photos, then try again.” The existing inspection record must
   still be present and unchanged. No new PNG should appear.
6. Independently open **Share** and tap **Share Image Card**. Confirm the
   native share sheet opens with the result-card image. This pass is separate
   from **Save to Photos** and must work even when Photos access is denied.

The native test `testDeviceFirstUseAddOnlySaveSucceeds` performs the real
add-only authorization and write. The deterministic coordinator test enforces
one write call. The device check confirms the one resulting image in Photos,
because add-only authorization intentionally does not let PepScan read the
library back to count assets. The native test skips when permission is already
granted so stale authorization cannot make a first-use check look green.