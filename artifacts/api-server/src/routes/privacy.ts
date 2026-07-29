import { Router } from "express";

const router = Router();

router.get("/privacy", (_req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>PepScan Privacy Policy</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; max-width: 720px; margin: 0 auto; padding: 40px 24px; font-size: 15px; line-height: 1.7; color: #111; }
    h1 { font-size: 26px; margin-bottom: 4px; }
    h2 { font-size: 17px; margin-top: 32px; margin-bottom: 8px; }
    p, li { margin-bottom: 8px; }
    ul { padding-left: 20px; }
    a { color: #1a73e8; }
    .date { color: #666; margin-bottom: 24px; display: block; }
  </style>
</head>
<body>
  <h1>Privacy Policy</h1>
  <span class="date">Last updated: 27 July 2026</span>

  <p>PepScan ("we", "our", or "us") is a mobile application for visual inspection of peptide and research compound vials. This Privacy Policy explains what information we collect, how we use it, and your rights under applicable law including the UK GDPR and EU GDPR.</p>

  <h2>Information We Collect</h2>
  <ul>
    <li><strong>Camera images (free tier):</strong> Photos taken in the App are analysed entirely on your device using local algorithms. They are not transmitted to our servers.</li>
    <li><strong>Camera images (PepScan Pro — AI Vision):</strong> When you use the AI Vision feature (available to Pro subscribers), vial photographs are securely transmitted over HTTPS to our analysis server to generate AI-enhanced results. Images are processed immediately upon receipt and are <strong>not stored, logged, retained, or used for any purpose</strong> after the analysis response is returned to your device. No image is associated with your identity on our servers.</li>
    <li><strong>Scan history and session data:</strong> All scan sessions, results, and history are stored exclusively on your device in local storage. We have no access to this data.</li>
    <li><strong>Purchase information:</strong> If you subscribe to PepScan Pro, purchase transactions are processed and held by Google Play (Google LLC) or Apple (Apple Inc.). We receive only a confirmation of entitlement status. We do not store your payment card details.</li>
    <li><strong>Crash and diagnostic reports:</strong> We use Sentry (Functional Software, Inc.) to collect anonymised crash reports, error logs, and performance data. This may include device model, OS version, app version, and stack traces. Sentry data does not include your vial images, scan results, or any personally identifiable information.</li>
  </ul>

  <h2>Legal Basis for Processing (GDPR)</h2>
  <ul>
    <li><strong>Contract performance:</strong> Processing entitlement status for Pro subscriptions.</li>
    <li><strong>Legitimate interests:</strong> Anonymised crash and diagnostic reporting to maintain app stability and security. This processing does not override your fundamental rights.</li>
    <li><strong>Consent:</strong> Where we obtain your explicit consent before any other processing not described above.</li>
  </ul>

  <h2>How We Use Your Information</h2>
  <ul>
    <li>To provide AI Vision analysis results (Pro subscribers only)</li>
    <li>To verify and maintain your Pro subscription status</li>
    <li>To diagnose crashes and fix technical issues</li>
    <li>To improve the App's accuracy and performance over time</li>
  </ul>

  <h2>Data Retention</h2>
  <p>Vial images submitted for AI Vision analysis are not retained after processing (typically less than 30 seconds). Crash and diagnostic reports are retained by Sentry for up to 90 days. Subscription entitlement records are held for the duration of the subscription plus any legally required retention period. All on-device data is controlled entirely by you.</p>

  <h2>Data Sharing</h2>
  <p>We do not sell, rent, or share your personal data with third parties for marketing purposes. Data is shared only with the following processors under appropriate data processing agreements:</p>
  <ul>
    <li><strong>Sentry</strong> — anonymised crash and diagnostic reports (<a href="https://sentry.io/privacy/">sentry.io/privacy</a>)</li>
    <li><strong>Google Play / Google LLC</strong> — subscription and purchase handling</li>
    <li><strong>Apple Inc.</strong> — subscription and purchase handling (iOS)</li>
    <li><strong>Our AI analysis server</strong> — Pro AI Vision image processing (images not retained; server hosted in the EU/UK)</li>
  </ul>

  <h2>Your Rights</h2>
  <p>Under UK GDPR and EU GDPR, you have the following rights regarding any personal data we hold:</p>
  <ul>
    <li><strong>Right of access</strong> — request a copy of the personal data we hold about you</li>
    <li><strong>Right to rectification</strong> — request correction of inaccurate data</li>
    <li><strong>Right to erasure</strong> — request deletion of your personal data ("right to be forgotten")</li>
    <li><strong>Right to restriction</strong> — request that we limit how we process your data</li>
    <li><strong>Right to data portability</strong> — receive your data in a structured, machine-readable format</li>
    <li><strong>Right to object</strong> — object to processing based on legitimate interests</li>
    <li><strong>Right to withdraw consent</strong> — where processing is based on your consent</li>
  </ul>
  <p>Because all scan data is stored locally on your device, you can exercise your right to erasure at any time by clearing app data in your device settings or uninstalling the App. For any other data rights request, contact us at the address below.</p>
  <p>You have the right to lodge a complaint with your supervisory authority. In the UK, this is the <a href="https://ico.org.uk">Information Commissioner's Office (ICO)</a>. In the EU, contact your national data protection authority.</p>

  <h2>International Data Transfers</h2>
  <p>Where data is processed outside the UK or EEA (for example, by Sentry in the United States), we ensure appropriate safeguards are in place, including standard contractual clauses or adequacy decisions as applicable.</p>

  <h2>Children's Privacy</h2>
  <p>PepScan is intended for adults aged 18 and over. We do not knowingly collect personal data from anyone under 18. If you believe a minor has used the App, contact us immediately.</p>

  <h2>Contact / Data Controller</h2>
  <p>For all privacy and data enquiries, including exercising your rights, contact: <a href="mailto:support@pepscan.app">support@pepscan.app</a></p>

  <h2>Changes to This Policy</h2>
  <p>We may update this policy from time to time. Material changes will be notified by updating the date above. Continued use of PepScan after changes constitutes acceptance of the revised policy.</p>
</body>
</html>`);
});

export default router;
