export default function DeleteData() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-10 text-sm text-gray-800 leading-relaxed">
      <h1 className="text-2xl font-bold mb-2">Delete Your Data</h1>
      <p className="text-gray-500 mb-6">PepScan — Data Deletion</p>

      <p className="mb-4">
        PepScan stores all scan history and settings locally on your device. No
        personal account is created and no scan images are uploaded to our
        servers.
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">Delete all data instantly</h2>
      <p className="mb-4">
        To delete all data associated with PepScan, simply uninstall the app
        from your device. This permanently removes all scan history, settings,
        and cached data.
      </p>
      <ol className="list-decimal pl-5 space-y-1 mb-6">
        <li>Long-press the PepScan icon on your home screen or app drawer</li>
        <li>Tap <strong>Uninstall</strong> (or drag to the Uninstall area)</li>
        <li>Confirm — all local data is deleted immediately</li>
      </ol>

      <h2 className="text-lg font-semibold mt-6 mb-2">Clear data without uninstalling</h2>
      <ol className="list-decimal pl-5 space-y-1 mb-6">
        <li>Open your device <strong>Settings</strong></li>
        <li>Go to <strong>Apps</strong> → <strong>PepScan</strong></li>
        <li>Tap <strong>Storage</strong> → <strong>Clear data</strong></li>
      </ol>

      <h2 className="text-lg font-semibold mt-6 mb-2">Third-party data</h2>
      <p className="mb-4">
        Anonymised crash reports sent to Sentry are automatically deleted after
        90 days. No personally identifiable information is included in these
        reports.
      </p>
      <p className="mb-4">
        Purchase records are held by Google Play and governed by Google's own
        privacy and data deletion policies.
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">Contact us</h2>
      <p>
        If you have any questions about your data, email us at{" "}
        <a href="mailto:support@pepscan.app" className="text-blue-600 underline">
          support@pepscan.app
        </a>{" "}
        and we will respond within 30 days.
      </p>
    </div>
  );
}
