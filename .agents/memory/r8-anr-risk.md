---
name: R8 ProGuard ANR risk
description: proguard-android-optimize.txt causes a RenderProxy render-thread deadlock in Capacitor WebView apps — use proguard-android.txt instead
---

## Rule
Always use `proguard-android.txt` (not `proguard-android-optimize.txt`) as the base ProGuard file for this Capacitor Android app.

**Why:** The `-optimize` variant runs an extra R8 pass that aggressively inlines and rewrites threading/synchronisation primitives. In a Capacitor WebView app this caused a `RenderProxy::setStopped` ANR — the main thread deadlocked waiting on `future<T>::get` blocked on `pthread_cond_wait` (Sentry PEPSCAN-3, versionCode 30, Pixel 6 Pro Android 12).

**How to apply:** In `artifacts/vialscreen/android/app/build.gradle` release buildType, keep:
```
proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
```

Also keep in `proguard-rules.pro`:
- `-keep class android.view.** { *; }`
- `-keep class android.graphics.** { *; }`
- `-keepclassmembers class * { synchronized *; }`
- `-keep class java.util.concurrent.** { *; }`

Code shrinking (`minifyEnabled true`) and resource shrinking (`shrinkResources true`) remain safe to use.
