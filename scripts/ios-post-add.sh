#!/usr/bin/env bash
# Run this after `npx cap add ios` to patch iOS permissions and settings.
# Codemagic runs this automatically — see codemagic.yaml ios-release workflow.
set -e

INFO_PLIST="artifacts/vialscreen/ios/App/App/Info.plist"

if [ ! -f "$INFO_PLIST" ]; then
  echo "ERROR: Info.plist not found at $INFO_PLIST — run 'npx cap add ios' first"
  exit 1
fi

echo "Patching iOS Info.plist…"

# Camera usage description (required by App Store)
/usr/libexec/PlistBuddy -c \
  "Add :NSCameraUsageDescription string 'PepScan uses your camera to photograph vials for visual quality screening.'" \
  "$INFO_PLIST" 2>/dev/null || \
/usr/libexec/PlistBuddy -c \
  "Set :NSCameraUsageDescription 'PepScan uses your camera to photograph vials for visual quality screening.'" \
  "$INFO_PLIST"

# Photo library (for saving scan captures on older iOS)
/usr/libexec/PlistBuddy -c \
  "Add :NSPhotoLibraryUsageDescription string 'PepScan may save scan captures to your photo library.'" \
  "$INFO_PLIST" 2>/dev/null || \
/usr/libexec/PlistBuddy -c \
  "Set :NSPhotoLibraryUsageDescription 'PepScan may save scan captures to your photo library.'" \
  "$INFO_PLIST"

# Photo library add-only (iOS 11+)
/usr/libexec/PlistBuddy -c \
  "Add :NSPhotoLibraryAddUsageDescription string 'PepScan saves scan captures to your photo library.'" \
  "$INFO_PLIST" 2>/dev/null || \
/usr/libexec/PlistBuddy -c \
  "Set :NSPhotoLibraryAddUsageDescription 'PepScan saves scan captures to your photo library.'" \
  "$INFO_PLIST"

echo "✓ iOS Info.plist patched successfully"
