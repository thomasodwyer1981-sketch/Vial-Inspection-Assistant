export default function PrivacyPolicy() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-10 text-sm text-foreground leading-relaxed">
      <h1 className="text-2xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-muted-foreground mb-6">Last updated: July 22, 2026</p>

      <p className="mb-4">
        PepScan ("we", "our", or "us") is a mobile application that helps users
        visually inspect peptide vials. This Privacy Policy explains what
        information we collect, how we use it, and your rights.
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">Information We Collect</h2>
      <ul className="list-disc pl-5 space-y-1 mb-4">
        <li>
          <strong>Camera images:</strong> Photos you take within the app are
          processed locally on your device and are not uploaded to our servers.
        </li>
        <li>
          <strong>Purchase information:</strong> If you subscribe to PepScan Pro,
          purchase data is handled by Google Play or Whop. We do not store your
          payment details.
        </li>
        <li>
          <strong>Scan history:</strong> Saved scan sessions are stored locally
          on your device only.
        </li>
        <li>
          <strong>Usage data:</strong> We may collect anonymised crash reports
          and performance data via Sentry to improve the app.
        </li>
      </ul>

      <h2 className="text-lg font-semibold mt-6 mb-2">How We Use Your Information</h2>
      <ul className="list-disc pl-5 space-y-1 mb-4">
        <li>To provide and improve the PepScan service</li>
        <li>To verify Pro subscription status</li>
        <li>To diagnose and fix technical issues</li>
      </ul>

      <h2 className="text-lg font-semibold mt-6 mb-2">Data Sharing</h2>
      <p className="mb-4">
        We do not sell or share your personal data with third parties for
        marketing purposes. Camera images never leave your device. Crash reports
        are shared only with Sentry under a data processing agreement.
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">Children's Privacy</h2>
      <p className="mb-4">
        PepScan is intended for adults (18+) involved in peptide research and
        personal use. We do not knowingly collect data from children under 13.
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">Your Rights</h2>
      <p className="mb-4">
        You may delete all locally stored scan data at any time by uninstalling
        the app or clearing app data in your device settings. For any privacy
        enquiries, contact us at the address below.
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">Contact</h2>
      <p className="mb-4">
        For questions about this policy, email us at:{" "}
        <a href="mailto:support@pepscan.app" className="text-primary underline">
          support@pepscan.app
        </a>
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">Changes to This Policy</h2>
      <p>
        We may update this policy from time to time. Continued use of PepScan
        after changes constitutes acceptance of the revised policy.
      </p>
    </div>
  );
}
