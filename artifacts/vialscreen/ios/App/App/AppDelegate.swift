import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Purge SDK on-disk NSCoding caches on the first launch after an iOS
        // major-version upgrade.
        //
        // BACKGROUND
        // On iOS 26, -[NSException initWithCoder:] raises an ObjC exception
        // instead of decoding. Any plugin that calls NSKeyedUnarchiver on
        // data that was written (by an older SDK or iOS version) and that
        // references NSException will crash before any UI appears.
        //
        // Of the plugins in this project, only FirebaseAnalyticsPlugin.load()
        // does real initialisation work during Capacitor's plugin-registration
        // phase (it calls FirebaseApp.configure()). All other plugins
        // (Sentry, AppsFlyer, RevenueCat) only register notification observers
        // in their load() methods and start their native SDKs later from JS.
        //
        // The Sentry Cocoa SDK can exhibit the same pattern when it reads
        // stored crash envelopes on its first launch after an OS upgrade.
        //
        // STRATEGY
        // Delete the known NSCoding-based cache directories for these SDKs
        // before UIKit loads the view hierarchy (before CAPBridgeViewController
        // viewDidLoad and plugin registration). After deletion the SDKs
        // reinitialise from scratch using their current encoding format.
        //
        // This runs only on the first launch at a new iOS major version so
        // that normal restarts do not discard pending Sentry crash reports or
        // Firebase batched events.
        //
        // NOTE: iOS 26 device/simulator validation of this fix is required
        // before the App Store re-submission. The identified paths are based
        // on Sentry Cocoa SDK 9.x documentation and Firebase iOS SDK 12.x
        // source inspection; device logging may reveal additional paths.
        purgeNSCodingCachesAfterOSUpgrade()

        return true
    }

    // MARK: - Targeted cache purge

    private func purgeNSCodingCachesAfterOSUpgrade() {
        let defaults = UserDefaults.standard
        let versionKey = "io.pepscan.lastPurgedOSMajorVersion"
        let currentMajor = ProcessInfo.processInfo.operatingSystemVersion.majorVersion
        let lastPurgedMajor = defaults.integer(forKey: versionKey)  // 0 on first launch

        // Only act on the first launch at a newly seen iOS major version.
        guard lastPurgedMajor == 0 || lastPurgedMajor < currentMajor else { return }

        let fm = FileManager.default
        let caches  = fm.urls(for: .cachesDirectory,             in: .userDomainMask).first
        let library = fm.urls(for: .libraryDirectory,             in: .userDomainMask).first
        let appSupp = fm.urls(for: .applicationSupportDirectory,  in: .userDomainMask).first

        // (base directory, sub-path) pairs.
        //
        // Sentry paths: documented in Sentry Cocoa SDK 9.x integration guide.
        //   <Caches>/io.sentry/ — crash envelopes, breadcrumbs, session state
        //   <Library>/io.sentry/ — fallback used by some SDK versions
        //
        // Firebase paths: derived from Firebase iOS SDK 12.x source.
        //   GULNetworkURLSession stores NSURLRequest/Response via NSKeyedArchiver
        //   under <Library>/Google/Firebase/<component>/.
        //   Google Utilities network cache lives at <Library>/google-measurement-service/.
        let targets: [(URL?, String)] = [
            (caches,  "io.sentry"),
            (library, "io.sentry"),
            (library, "Google"),                  // Firebase component caches
            (library, "google-measurement-service"),
            (appSupp, "Google"),
        ]

        var anyDeletionFailed = false

        for (base, sub) in targets {
            guard let base = base else { continue }
            let url = base.appendingPathComponent(sub)
            guard fm.fileExists(atPath: url.path) else { continue }
            do {
                try fm.removeItem(at: url)
            } catch {
                // Non-fatal; leave anyDeletionFailed = true so the next
                // launch can retry the purge for this SDK.
                anyDeletionFailed = true
            }
        }

        // Record the purged OS version ONLY when every removal succeeded
        // (or there was nothing to remove). If any deletion failed, we leave
        // the version unrecorded so the next launch will retry the purge.
        if !anyDeletionFailed {
            defaults.set(currentMajor, forKey: versionKey)
        }
    }

    // MARK: - UIApplicationDelegate

    func applicationWillResignActive(_ application: UIApplication) { }
    func applicationDidEnterBackground(_ application: UIApplication) { }
    func applicationWillEnterForeground(_ application: UIApplication) { }
    func applicationDidBecomeActive(_ application: UIApplication) { }
    func applicationWillTerminate(_ application: UIApplication) { }

    func application(_ app: UIApplication, open url: URL,
                     options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication,
                     continue userActivity: NSUserActivity,
                     restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application,
                                                           continue: userActivity,
                                                           restorationHandler: restorationHandler)
    }
}
