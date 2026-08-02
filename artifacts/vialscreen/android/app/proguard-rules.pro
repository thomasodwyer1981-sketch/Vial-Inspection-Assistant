# ─── Android rendering / threading safety ────────────────────────────────────
# Prevents R8 from inlining or rewriting synchronisation primitives that back
# RenderProxy::setStopped — aggressive optimisation caused an ANR deadlock on
# the render thread (nSetStopped → future<T>::get → pthread_cond_wait).
-keep class android.view.** { *; }
-keep class android.graphics.** { *; }
-keepclassmembers class * {
    synchronized *;
}
-keep class java.util.concurrent.** { *; }
-keepclassmembers class java.util.concurrent.** { *; }
-keep class java.util.concurrent.atomic.** { *; }

# ─── Capacitor / WebView JS bridge ───────────────────────────────────────────
-keep class com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keepclassmembers class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.annotation.PluginMethod public *;
}
# Keep JavaScript interfaces used by WebView
-keepattributes JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# ─── AppsFlyer ───────────────────────────────────────────────────────────────
-keep class com.appsflyer.** { *; }
-keep public class com.android.installreferrer.** { *; }
-keep class capacitor.plugin.appsflyer.** { *; }

# ─── RevenueCat ──────────────────────────────────────────────────────────────
-keep class com.revenuecat.** { *; }
-keep class com.android.billingclient.** { *; }

# ─── Sentry ──────────────────────────────────────────────────────────────────
-keep class io.sentry.** { *; }
-dontwarn io.sentry.**

# ─── OkHttp / Okio (used by RevenueCat & AppsFlyer) ─────────────────────────
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }

# ─── Kotlin & coroutines ─────────────────────────────────────────────────────
-keep class kotlin.** { *; }
-keep class kotlinx.coroutines.** { *; }
-dontwarn kotlinx.coroutines.**

# ─── Reflection / serialisation safety ───────────────────────────────────────
-keepattributes Signature
-keepattributes *Annotation*
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# ─── Gson / JSON (if used by any plugin) ─────────────────────────────────────
-keep class com.google.gson.** { *; }
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}

# ─── General: preserve enums ─────────────────────────────────────────────────
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}
