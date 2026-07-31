export default function PrivacyPolicy() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-10 text-sm text-foreground leading-relaxed">
      <h1 className="text-2xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-muted-foreground mb-6">Last updated: 27 July 2026</p>

      <p className="mb-4">
        PepScan ("we", "our", or "us") is a mobile application for visual inspection of peptide and
        research compound vials. This Privacy Policy explains what information we collect, how we use
        it, and your rights under applicable law including the UK GDPR and EU GDPR.
      </p>

      {/* ── What we collect ── */}
      <h2 className="text-lg font-semibold mt-6 mb-2">Information We Collect</h2>
      <ul className="list-disc pl-5 space-y-3 mb-4">
        <li>
          <strong>Camera images (free tier):</strong> Photos taken in the App are analysed entirely
          on your device using local algorithms. They are not transmitted to our servers.
        </li>
        <li>
          <strong>Camera images (PepScan Pro — AI Vision):</strong> When you use the AI Vision
          feature (available to Pro subscribers), vial photographs are securely transmitted over
          HTTPS to our analysis server to generate AI-enhanced results. Images are processed
          immediately upon receipt and are{' '}
          <strong>not stored, logged, retained, or used for any purpose</strong> after the analysis
          response is returned to your device. No image is associated with your identity on our
          servers.
        </li>
        <li>
          <strong>Scan history and session data:</strong> All scan sessions, results, and history
          are stored exclusively on your device in local storage. We have no access to this data.
        </li>
        <li>
          <strong>Purchase information:</strong> If you subscribe to PepScan Pro, purchase
          transactions are processed and held by Google Play (Google LLC) or Whop. We receive only
          a confirmation of entitlement status. We do not store your payment card details.
        </li>
        <li>
          <strong>Crash and diagnostic reports:</strong> We use Sentry (Functional Software, Inc.)
          to collect anonymised crash reports, error logs, and performance data. This may include
          device model, Android version, app version, and stack traces. Sentry data does not include
          your vial images, scan results, or any personally identifiable information.
        </li>
      </ul>

      {/* ── Legal bases ── */}
      <h2 className="text-lg font-semibold mt-6 mb-2">Legal Basis for Processing (GDPR)</h2>
      <ul className="list-disc pl-5 space-y-2 mb-4">
        <li>
          <strong>Contract performance:</strong> Processing entitlement status for Pro subscriptions.
        </li>
        <li>
          <strong>Legitimate interests:</strong> Anonymised crash and diagnostic reporting to
          maintain app stability and security. This processing does not override your fundamental
          rights.
        </li>
        <li>
          <strong>Consent:</strong> Where we obtain your explicit consent before any other
          processing not described above.
        </li>
      </ul>

      {/* ── How we use ── */}
      <h2 className="text-lg font-semibold mt-6 mb-2">How We Use Your Information</h2>
      <ul className="list-disc pl-5 space-y-1 mb-4">
        <li>To provide AI Vision analysis results (Pro subscribers only)</li>
        <li>To verify and maintain your Pro subscription status</li>
        <li>To diagnose crashes and fix technical issues</li>
        <li>To improve the App's accuracy and performance over time</li>
      </ul>

      {/* ── Data retention ── */}
      <h2 className="text-lg font-semibold mt-6 mb-2">Data Retention</h2>
      <p className="mb-4">
        Vial images submitted for AI Vision analysis are not retained after processing (typically
        less than 30 seconds). Crash and diagnostic reports are retained by Sentry for up to 90 days.
        Subscription entitlement records are held for the duration of the subscription plus any
        legally required retention period. All on-device data is controlled entirely by you.
      </p>

      {/* ── Data sharing ── */}
      <h2 className="text-lg font-semibold mt-6 mb-2">Data Sharing</h2>
      <p className="mb-4">
        We do not sell, rent, or share your personal data with third parties for marketing purposes.
        Data is shared only with the following processors under appropriate data processing agreements:
      </p>
      <ul className="list-disc pl-5 space-y-1 mb-4">
        <li>
          <strong>Sentry</strong> — anonymised crash and diagnostic reports (Sentry processes data
          under its standard DPA; see{' '}
          <a
            href="https://sentry.io/privacy/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline"
          >
            sentry.io/privacy
          </a>
          )
        </li>
        <li>
          <strong>Google Play / Google LLC</strong> — subscription and purchase handling
        </li>
        <li>
          <strong>Our AI analysis server</strong> — Pro AI Vision image processing (images not
          retained; server hosted in the EU/UK)
        </li>
      </ul>

      {/* ── Your rights ── */}
      <h2 className="text-lg font-semibold mt-6 mb-2">Your Rights</h2>
      <p className="mb-2">
        Under UK GDPR and EU GDPR, you have the following rights regarding any personal data we hold:
      </p>
      <ul className="list-disc pl-5 space-y-1 mb-4">
        <li><strong>Right of access</strong> — request a copy of the personal data we hold about you</li>
        <li><strong>Right to rectification</strong> — request correction of inaccurate data</li>
        <li><strong>Right to erasure</strong> — request deletion of your personal data ("right to be forgotten")</li>
        <li><strong>Right to restriction</strong> — request that we limit how we process your data</li>
        <li><strong>Right to data portability</strong> — receive your data in a structured, machine-readable format</li>
        <li><strong>Right to object</strong> — object to processing based on legitimate interests</li>
        <li><strong>Right to withdraw consent</strong> — where processing is based on your consent</li>
      </ul>
      <p className="mb-4">
        Because all scan data is stored locally on your device, you can exercise your right to
        erasure at any time by clearing app data in your device settings or uninstalling the App.
        For any other data rights request, contact us at the address below.
      </p>
      <p className="mb-4">
        You have the right to lodge a complaint with your supervisory authority. In the UK, this is
        the{' '}
        <a
          href="https://ico.org.uk"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline"
        >
          Information Commissioner's Office (ICO)
        </a>
        . In the EU, contact your national data protection authority.
      </p>

      {/* ── International transfers ── */}
      <h2 className="text-lg font-semibold mt-6 mb-2">International Data Transfers</h2>
      <p className="mb-4">
        Where data is processed outside the UK or EEA (for example, by Sentry in the United States),
        we ensure appropriate safeguards are in place, including standard contractual clauses or
        adequacy decisions as applicable.
      </p>

      {/* ── Children ── */}
      <h2 className="text-lg font-semibold mt-6 mb-2">Children's Privacy</h2>
      <p className="mb-4">
        PepScan is intended for adults aged 18 and over. We do not knowingly collect personal data
        from anyone under 18. If you believe a minor has used the App, contact us immediately.
      </p>

      {/* ── Contact ── */}
      <h2 className="text-lg font-semibold mt-6 mb-2">Contact / Data Controller</h2>
      <p className="mb-4">
        For all privacy and data enquiries, including exercising your rights, contact:{' '}
        <a href="mailto:pepscan@peptilog.ie" className="text-primary underline">
          pepscan@peptilog.ie
        </a>
      </p>

      {/* ── Changes ── */}
      <h2 className="text-lg font-semibold mt-6 mb-2">Changes to This Policy</h2>
      <p>
        We may update this policy from time to time. Material changes will be notified by updating
        the date above. Continued use of PepScan after changes constitutes acceptance of the revised
        policy.
      </p>

      <div className="h-8" />
    </div>
  );
}
