// swift-tools-version: 5.9
import PackageDescription

// DO NOT MODIFY THIS FILE - managed by Capacitor CLI commands
let package = Package(
    name: "CapApp-SPM",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "CapApp-SPM",
            targets: ["CapApp-SPM"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.4.2"),
        .package(name: "CapacitorCommunityInAppReview", path: "../../../../../node_modules/.pnpm/@capacitor-community+in-app-review@8.0.0_@capacitor+core@8.4.2/node_modules/@capacitor-community/in-app-review"),
        .package(name: "CapacitorFirebaseAnalytics", path: "../../../../../node_modules/.pnpm/@capacitor-firebase+analytics@8.3.0_@capacitor+core@8.4.2_firebase@12.16.0/node_modules/@capacitor-firebase/analytics"),
        .package(name: "CapacitorApp", path: "../../../../../node_modules/.pnpm/@capacitor+app@8.1.1_@capacitor+core@8.4.2/node_modules/@capacitor/app"),
        .package(name: "CapacitorFilesystem", path: "../../../../../node_modules/.pnpm/@capacitor+filesystem@8.1.2_@capacitor+core@8.4.2/node_modules/@capacitor/filesystem"),
        .package(name: "CapacitorHaptics", path: "../../../../../node_modules/.pnpm/@capacitor+haptics@8.0.2_@capacitor+core@8.4.2/node_modules/@capacitor/haptics"),
        .package(name: "CapacitorShare", path: "../../../../../node_modules/.pnpm/@capacitor+share@8.0.1_@capacitor+core@8.4.2/node_modules/@capacitor/share"),
        .package(name: "RevenuecatPurchasesCapacitor", path: "../../../../../node_modules/.pnpm/@revenuecat+purchases-capacitor@13.2.3_@capacitor+core@8.4.2/node_modules/@revenuecat/purchases-capacitor"),
        .package(name: "SentryCapacitor", path: "../../../../../node_modules/.pnpm/@sentry+capacitor@4.3.0_@capacitor+core@8.4.2_@sentry+react@10.69.0_react@19.1.0_/node_modules/@sentry/capacitor"),
        .package(name: "AppsflyerCapacitorPlugin", path: "../../../../../node_modules/.pnpm/appsflyer-capacitor-plugin@6.18.0_@capacitor+core@8.4.2/node_modules/appsflyer-capacitor-plugin")
    ],
    targets: [
        .target(
            name: "CapApp-SPM",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
                .product(name: "CapacitorCommunityInAppReview", package: "CapacitorCommunityInAppReview"),
                .product(name: "CapacitorFirebaseAnalytics", package: "CapacitorFirebaseAnalytics"),
                .product(name: "CapacitorApp", package: "CapacitorApp"),
                .product(name: "CapacitorFilesystem", package: "CapacitorFilesystem"),
                .product(name: "CapacitorHaptics", package: "CapacitorHaptics"),
                .product(name: "CapacitorShare", package: "CapacitorShare"),
                .product(name: "RevenuecatPurchasesCapacitor", package: "RevenuecatPurchasesCapacitor"),
                .product(name: "SentryCapacitor", package: "SentryCapacitor"),
                .product(name: "AppsflyerCapacitorPlugin", package: "AppsflyerCapacitorPlugin")
            ]
        )
    ]
)
