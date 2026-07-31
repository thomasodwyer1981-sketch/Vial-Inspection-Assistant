import { Link, useLocation } from 'wouter';
import { ArrowLeft } from 'lucide-react';

export default function TermsScreen() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur border-b px-4 py-3 flex items-center gap-3 z-10">
        <button
          onClick={() => { if (window.history.length > 1) window.history.back(); else setLocation('/home'); }}
          className="p-2 -ml-2 rounded-full hover:bg-muted active:bg-muted"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-lg">Terms of Use</h1>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 text-sm text-foreground leading-relaxed space-y-7">
        <p className="text-xs text-muted-foreground">Last updated: 31 July 2026</p>

        {/* ── 1. Acceptance ── */}
        <section>
          <h2 className="text-base font-bold mb-2">1. Acceptance of These Terms</h2>
          <p>
            By downloading, installing, or using PepScan ("the App"), you agree to be bound by these Terms
            of Use ("Terms"). If you do not agree, do not use the App. These Terms form a legally binding
            agreement between you and the developers of PepScan ("we", "us", or "our").
          </p>
        </section>

        {/* ── 2. Description ── */}
        <section>
          <h2 className="text-base font-bold mb-2">2. What PepScan Is</h2>
          <p className="mb-3">
            PepScan is a <strong>consumer visual screening assistant</strong>. It uses your device camera and
            image analysis to screen for obvious visible presentation issues in peptide and research compound
            vials — such as visible particles, haze, fill anomalies, and label readability.
          </p>
          <p className="mb-3">
            PepScan is provided for <strong>educational and personal research reference purposes only</strong>.
            It is not a medical device, diagnostic tool, laboratory instrument, or safety certification system.
          </p>
          <p className="font-semibold text-destructive">
            PepScan is NOT intended for human use. It must not be used to support, justify, or inform any
            decision to administer any substance to yourself or any other person.
          </p>
        </section>

        {/* ── 2b. Accuracy Depends on Conditions ── */}
        <section>
          <h2 className="text-base font-bold mb-2">2a. Results Depend on Device and Conditions</h2>
          <p className="mb-3">
            PepScan's analysis is based entirely on images captured by your device camera under conditions
            you control. Results are directly affected by — and may vary significantly based on — camera
            quality and resolution, ambient lighting, background material, capture angle, user technique,
            vial glass type and tint, and other environmental factors.
          </p>
          <p>
            <strong>The same vial may produce different results under different conditions.</strong> A result
            produced under suboptimal conditions (poor lighting, motion blur, incorrect background, low camera
            resolution) may be unreliable regardless of its outcome. We make no representation that any result
            accurately reflects the true condition of any vial.
          </p>
        </section>

        {/* ── 3. NOT a Medical Device ── */}
        <section className="bg-destructive/5 border border-destructive/20 rounded-2xl p-4">
          <h2 className="text-base font-bold mb-3 text-destructive">3. PepScan Is NOT a Medical Device</h2>
          <p className="mb-3">
            <strong>PepScan has not been approved, cleared, or certified by any regulatory body</strong> including
            the FDA, MHRA, TGA, EMA, or any equivalent authority. It must not be used as a substitute for
            professional laboratory analysis, pharmacopeial testing, or medical advice.
          </p>
          <p className="mb-3 font-semibold">PepScan cannot and does not:</p>
          <ul className="space-y-1.5 pl-4 list-disc text-muted-foreground">
            <li>Confirm the identity, purity, potency, or concentration of any substance</li>
            <li>Detect sterility issues, endotoxins, biological contaminants, or pathogens</li>
            <li>Identify submicron particles, chemical degradation products, or adulterants</li>
            <li>Guarantee that a vial is safe, authentic, or fit for any purpose</li>
            <li>Replace direct physical inspection, laboratory testing, or medical consultation</li>
            <li>Be used to support any decision to administer any substance to any person</li>
          </ul>
        </section>

        {/* ── 4. A "Pass" Result Does Not Mean Safe ── */}
        <section className="bg-warning/5 border border-warning/20 rounded-2xl p-4">
          <h2 className="text-base font-bold mb-3">4. A "Pass" Result Does Not Mean Safe</h2>
          <p className="mb-3">
            A "Pass" result means only that <strong>no obvious visual issue was detected</strong> under the
            specific lighting, background, and capture conditions at the time of the scan. A "Pass" result
            expressly and unambiguously does <strong>not</strong> mean that the vial is:
          </p>
          <ul className="space-y-1.5 pl-4 list-disc text-muted-foreground mb-3">
            <li>Safe, sterile, pure, or uncontaminated</li>
            <li>Correctly labelled, undiluted, or authentic</li>
            <li>Free from chemical degradation, biological contaminants, or pathogens</li>
            <li>Fit for injection, inhalation, consumption, or any other use</li>
          </ul>
          <p>
            <strong>You bear sole responsibility for any decision to use a substance based on any
            PepScan result.</strong> Always conduct a direct physical inspection and consult appropriate
            professionals before use.
          </p>
        </section>

        {/* ── 5. Intended Users ── */}
        <section>
          <h2 className="text-base font-bold mb-2">5. Intended Users and Permitted Use</h2>
          <p className="mb-3">
            PepScan is intended solely for adults aged 18 and over engaged in lawful peptide or research
            compound activities. By using the App you confirm that:
          </p>
          <ul className="space-y-1.5 pl-4 list-disc text-muted-foreground">
            <li>You are 18 years of age or older</li>
            <li>You are using the App for lawful purposes only</li>
            <li>You understand and accept the limitations described in these Terms</li>
            <li>You will not rely solely on PepScan results when making any decision</li>
          </ul>
        </section>

        {/* ── 6. Assumption of Risk ── */}
        <section>
          <h2 className="text-base font-bold mb-2">6. Assumption of Risk</h2>
          <p className="mb-3">
            You expressly acknowledge and agree that use of PepScan and reliance on its results involves
            inherent risks, including but not limited to the risk of incorrect results, missed visual defects,
            false reassurance, personal injury, adverse reactions, illness, or death.
          </p>
          <p>
            <strong>You voluntarily assume all such risks.</strong> Your use of the App is entirely at your
            own risk and discretion. We strongly recommend that you treat all research compounds with
            appropriate caution regardless of any PepScan result.
          </p>
        </section>

        {/* ── 7. LIMITATION OF LIABILITY — the core clause ── */}
        <section className="bg-muted rounded-2xl p-4 border">
          <h2 className="text-base font-bold mb-3 uppercase tracking-wide">7. Limitation of Liability</h2>
          <p className="mb-3 font-semibold">
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, PEPSCAN AND ITS DEVELOPERS, OFFICERS,
            EMPLOYEES, CONTRACTORS, AND AGENTS ("PEPSCAN PARTIES") SHALL NOT BE LIABLE FOR ANY LOSS,
            DAMAGE, INJURY, OR HARM OF ANY KIND ARISING FROM OR IN CONNECTION WITH:
          </p>
          <ul className="space-y-1.5 pl-4 list-disc mb-3">
            <li>Use of or reliance on any PepScan screening result</li>
            <li>Any decision made — or not made — based on a PepScan result</li>
            <li>Personal injury, adverse physical reaction, illness, or death</li>
            <li>Incorrect, incomplete, or misleading screening results</li>
            <li>Technical failures, errors, or unavailability of the App</li>
            <li>Loss of data, financial loss, or property damage</li>
          </ul>
          <p className="mb-3">
            THIS LIMITATION APPLIES REGARDLESS OF THE LEGAL THEORY RELIED UPON, INCLUDING CONTRACT,
            TORT (INCLUDING NEGLIGENCE), STRICT LIABILITY, OR OTHERWISE, AND WHETHER OR NOT THE
            PEPSCAN PARTIES WERE ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
          </p>
          <p className="text-xs text-muted-foreground">
            Some jurisdictions do not permit certain liability exclusions. Where such exclusions are
            not permitted, the PepScan Parties' liability is limited to the fullest extent permitted
            by applicable law. In no event shall the PepScan Parties' total aggregate liability to
            you exceed the amount you paid for the App in the twelve months preceding the claim.
          </p>
        </section>

        {/* ── 8. Indemnification ── */}
        <section>
          <h2 className="text-base font-bold mb-2">8. Indemnification</h2>
          <p>
            You agree to indemnify, defend, and hold harmless the PepScan Parties from and against any
            claims, liabilities, damages, losses, costs, and expenses (including reasonable legal fees)
            arising out of or in any way connected with your use of the App, your violation of these
            Terms, or any decision you make in reliance on a PepScan result.
          </p>
        </section>

        {/* ── 9. Subscription ── */}
        <section>
          <h2 className="text-base font-bold mb-2">9. PepScan Pro Subscription</h2>
          <ul className="space-y-2 pl-4 list-disc text-muted-foreground">
            <li>PepScan Pro is an optional paid subscription billed annually via Google Play.</li>
            <li>Your subscription will automatically renew at the end of each annual period unless cancelled at least 24 hours before the renewal date.</li>
            <li>You may cancel at any time via your Google Play account. Cancellation takes effect at the end of the current billing period; no partial refunds are issued except as required by applicable law or Google Play's refund policy.</li>
            <li>Prices are shown in USD and may vary by region. The price at the time of purchase is confirmed in Google Play before you complete the transaction.</li>
            <li>We reserve the right to change the subscription price; any change will be notified to you in advance and will not affect your current billing period.</li>
          </ul>
        </section>

        {/* ── 10. Intellectual Property ── */}
        <section>
          <h2 className="text-base font-bold mb-2">10. Intellectual Property</h2>
          <p>
            All content, design, code, and features of PepScan are owned by or licensed to the PepScan
            developers. You are granted a limited, non-exclusive, non-transferable licence to use the App
            on your device solely for its intended purpose. You may not copy, modify, distribute, sell,
            or reverse-engineer any part of the App.
          </p>
        </section>

        {/* ── 11. Privacy ── */}
        <section>
          <h2 className="text-base font-bold mb-2">11. Privacy and Data</h2>
          <p>
            Our collection and use of your personal information is governed by our{' '}
            <Link href="/privacy" className="text-primary underline underline-offset-2">Privacy Policy</Link>,
            which is incorporated into these Terms by reference. By using PepScan you consent to our
            data practices as described in the Privacy Policy.
          </p>
        </section>

        {/* ── 12. Changes ── */}
        <section>
          <h2 className="text-base font-bold mb-2">12. Changes to These Terms</h2>
          <p>
            We may update these Terms from time to time. We will notify you of material changes by
            updating the date at the top of this page. Continued use of the App after changes take
            effect constitutes your acceptance of the revised Terms.
          </p>
        </section>

        {/* ── 13. Governing Law ── */}
        <section>
          <h2 className="text-base font-bold mb-2">13. Governing Law</h2>
          <p>
            These Terms are governed by and construed in accordance with the laws of England and Wales.
            You agree to submit to the exclusive jurisdiction of the courts of England and Wales for
            resolution of any dispute arising from these Terms or your use of the App, except where
            mandatory local consumer protection laws in your jurisdiction provide otherwise.
          </p>
        </section>

        {/* ── 14. Contact ── */}
        <section>
          <h2 className="text-base font-bold mb-2">14. Contact</h2>
          <p>
            Questions about these Terms? Contact us at{' '}
            <a href="mailto:support@pepscan.app" className="text-primary underline underline-offset-2">
              support@pepscan.app
            </a>
          </p>
        </section>

        <div className="h-8" />
      </div>
    </div>
  );
}
