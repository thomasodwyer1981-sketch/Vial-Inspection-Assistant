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

        {/* ── Operator ── */}
        <section className="bg-muted/60 rounded-xl p-4 text-xs text-muted-foreground">
          <p>
            PepScan is operated by <strong>Peptilog Ltd</strong>, Gorey, Co. Wexford, Ireland ("we", "us", or "our").
          </p>
        </section>

        {/* ── 1. Acceptance ── */}
        <section>
          <h2 className="text-base font-bold mb-2">1. Acceptance of These Terms</h2>
          <p>
            By downloading, installing, or using PepScan ("the App"), you agree to be bound by these Terms
            of Use ("Terms"). If you do not agree, do not use the App. These Terms form a legally binding
            agreement between you and us.
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

        {/* ── 2a. Accuracy Depends on Conditions ── */}
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

        {/* ── 3a. No Medical Advice or Emergency Use ── */}
        <section>
          <h2 className="text-base font-bold mb-2">3a. No Medical Advice or Emergency Use</h2>
          <p>
            PepScan does not provide medical advice, clinical advice, pharmaceutical advice, laboratory
            certification, or emergency guidance. PepScan is not intended for use in any emergency or urgent
            safety situation. If you suspect contamination, mislabelling, adverse reaction, injury, poisoning,
            or any other health or safety issue, do not rely on the App and seek appropriate professional,
            medical, laboratory, poison-control, or emergency assistance immediately.
          </p>
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

        {/* ── 5a. Prohibited Use ── */}
        <section>
          <h2 className="text-base font-bold mb-2">5a. Prohibited Use</h2>
          <p className="mb-3">
            You may use PepScan only for lawful, personal, non-commercial, educational, and
            research-reference purposes. You must not use PepScan:
          </p>
          <ul className="space-y-1.5 pl-4 list-disc text-muted-foreground">
            <li>to diagnose, treat, cure, prevent, monitor, or assess any disease, condition, injury, or medical issue;</li>
            <li>to support, justify, or inform any decision to inject, ingest, inhale, administer, prescribe, dispense, sell, supply, or distribute any substance for human or animal use;</li>
            <li>in any clinical, healthcare, pharmacy, laboratory certification, quality assurance, manufacturing, resale, regulatory, or other high-risk or regulated setting;</li>
            <li>in violation of any applicable law, regulation, export control law, sanctions restriction, or third-party right;</li>
            <li>to bypass or interfere with app safeguards, subscriptions, access controls, security features, or technical protections;</li>
            <li>to copy, scrape, reverse engineer, decompile, extract source code from, or create derivative works from the App except where such restriction is prohibited by applicable law.</li>
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

        {/* ── 7. LIMITATION OF LIABILITY ── */}
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

        {/* ── 7a. No Warranties ── */}
        <section className="bg-muted rounded-2xl p-4 border">
          <h2 className="text-base font-bold mb-3 uppercase tracking-wide">7a. No Warranties</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, PEPSCAN IS PROVIDED "AS IS" AND
            "AS AVAILABLE," WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, STATUTORY,
            OR OTHERWISE. WITHOUT LIMITING THE FOREGOING, WE DISCLAIM ANY WARRANTIES OF ACCURACY,
            RELIABILITY, COMPLETENESS, FITNESS FOR A PARTICULAR PURPOSE, MERCHANTABILITY,
            NON-INFRINGEMENT, AVAILABILITY, SECURITY, OR THAT THE APP WILL OPERATE WITHOUT
            INTERRUPTION, ERROR, OR FALSE POSITIVES OR FALSE NEGATIVES.
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
          <p>
            PepScan Pro is an optional paid subscription offered through Google Play. Payment will be
            charged to your Google Play account at confirmation of purchase. Unless cancelled at least
            24 hours before the end of the current billing period, your subscription will automatically
            renew for the same term and Google Play will charge your account for renewal. You can manage
            or cancel your subscription through your Google Play account settings. Any free trial,
            introductory price, promotional offer, renewal pricing, taxes, and refund rights will be
            shown to you in Google Play before purchase and will be governed by applicable law and
            Google Play policies where relevant.
          </p>
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
            Our collection and use of personal data is described in our{' '}
            <Link href="/privacy" className="text-primary underline underline-offset-2">Privacy Policy</Link>,
            which is incorporated into these Terms by reference. You acknowledge that the App may process
            account information, device information, usage information, subscription information, support
            communications, and image-related data as described in the Privacy Policy. You are responsible
            for ensuring that you have the right to provide any data or content you submit to the App.
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
            These Terms are governed by the laws of Ireland, excluding conflict of laws principles.
            Nothing in these Terms limits any non-excludable consumer rights or mandatory protections
            that apply to you under the laws of your country, state, or place of residence.
          </p>
        </section>

        {/* ── 14. Third-Party Services ── */}
        <section>
          <h2 className="text-base font-bold mb-2">14. Third-Party Services and Platforms</h2>
          <p>
            PepScan may rely on third-party services, platforms, and infrastructure, including mobile
            operating systems, device hardware, app stores, payment processors, analytics providers,
            crash reporting tools, hosting providers, and other service providers. We are not responsible
            for the availability, performance, acts, omissions, security, or policies of third-party
            services. Purchases, billing, cancellations, and refunds may also be subject to the applicable
            app store's terms and policies.
          </p>
        </section>

        {/* ── 15. Suspension and Termination ── */}
        <section>
          <h2 className="text-base font-bold mb-2">15. Suspension and Termination</h2>
          <p className="mb-3">
            We may suspend, restrict, or terminate your access to PepScan at any time, with or without
            notice, if we reasonably believe that:
          </p>
          <ul className="space-y-1.5 pl-4 list-disc text-muted-foreground mb-3">
            <li>you have violated these Terms;</li>
            <li>your use creates legal, regulatory, security, fraud, abuse, or reputational risk;</li>
            <li>continued access could harm us, other users, or third parties; or</li>
            <li>we are required to do so by law, platform rules, or a request from a competent authority.</li>
          </ul>
          <p>
            On termination, the rights granted to you under these Terms will immediately cease. Sections
            intended by their nature to survive termination — including disclaimers, limitation of
            liability, indemnity, intellectual property, governing law, and dispute-related provisions —
            will survive.
          </p>
        </section>

        {/* ── 16. Account Accuracy ── */}
        <section>
          <h2 className="text-base font-bold mb-2">16. Account Accuracy</h2>
          <p>
            You agree to provide accurate, current, and complete information and to keep it updated.
            We may suspend access where information provided is false, misleading, or incomplete.
          </p>
        </section>

        {/* ── 17. Export and Sanctions Compliance ── */}
        <section>
          <h2 className="text-base font-bold mb-2">17. Export and Sanctions Compliance</h2>
          <p>
            You may not use the App if you are subject to applicable sanctions or export restrictions,
            or if such use would violate applicable export control laws.
          </p>
        </section>

        {/* ── 18. Feedback ── */}
        <section>
          <h2 className="text-base font-bold mb-2">18. Feedback</h2>
          <p>
            If you provide suggestions, ideas, or feedback regarding PepScan, you grant us a worldwide,
            perpetual, irrevocable, royalty-free licence to use, modify, and incorporate that feedback
            without compensation or obligation.
          </p>
        </section>

        {/* ── 19. Electronic Communications ── */}
        <section>
          <h2 className="text-base font-bold mb-2">19. Electronic Communications</h2>
          <p>
            By using the App, you agree that we may provide notices and communications electronically,
            including through the App, website, or by email where provided.
          </p>
        </section>

        {/* ── 20. Severability, Waiver, and Assignment ── */}
        <section>
          <h2 className="text-base font-bold mb-2">20. Severability, Waiver, and Assignment</h2>
          <p>
            If any provision of these Terms is held unenforceable, the remaining provisions will remain
            in effect. Our failure to enforce any provision is not a waiver. We may assign these Terms
            in connection with a merger, sale, restructuring, or transfer of the App or related business.
          </p>
        </section>

        {/* ── 21. Contact ── */}
        <section>
          <h2 className="text-base font-bold mb-2">21. Contact</h2>
          <p>
            Questions about these Terms? Contact us at{' '}
            <a href="mailto:pepscan@peptilog.ie" className="text-primary underline underline-offset-2">
              pepscan@peptilog.ie
            </a>
          </p>
        </section>

        <div className="h-8" />
      </div>
    </div>
  );
}
