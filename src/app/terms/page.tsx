export default function TermsPage() {
  return (
    <main className="min-h-screen px-6 py-16">
      <div className="max-w-2xl mx-auto">
        <a href="/" className="wordmark text-sm tracking-[0.2em] font-semibold text-hitl-text inline-block mb-12">
          MEATSPACE
        </a>

        <h1 className="text-2xl font-semibold text-hitl-text mb-2">Terms of Use</h1>
        <p className="text-sm text-hitl-text-muted mb-10">Last updated: April 2026</p>

        <div className="flex flex-col gap-8 text-sm text-hitl-text-secondary leading-relaxed">
          <section>
            <h2 className="text-base font-medium text-hitl-text mb-3">1. Service Description</h2>
            <p>
              MeatSpace (&quot;the Service&quot;) provides a flesh-in-the-loop (FITL) dispatch API
              that enables AI agents to submit decision requests for human review. The Service
              receives structured requests, notifies a human reviewer, and returns the
              reviewer&apos;s selection to the requesting agent.
            </p>
          </section>

          <section>
            <h2 className="text-base font-medium text-hitl-text mb-3">2. Acceptable Use</h2>
            <p>
              You agree to use MeatSpace only for lawful purposes. You will not submit requests
              containing illegal content, personal data of third parties without consent,
              content designed to harass or harm, or content that violates any applicable law.
              We reserve the right to refuse service or terminate access for violations.
            </p>
          </section>

          <section>
            <h2 className="text-base font-medium text-hitl-text mb-3">3. No Guarantees</h2>
            <p>
              MeatSpace is provided &quot;as is&quot; during the beta period. We do not guarantee
              response times, availability, or specific outcomes. Human reviewers exercise
              subjective judgment; responses reflect individual opinion, not professional advice.
              Do not rely on MeatSpace responses for medical, legal, financial, or safety-critical
              decisions.
            </p>
          </section>

          <section>
            <h2 className="text-base font-medium text-hitl-text mb-3">4. API Keys &amp; Authentication</h2>
            <p>
              You are responsible for safeguarding your API key. Do not share keys or embed them
              in client-side code. Notify us immediately if you suspect unauthorized use. We may
              revoke compromised keys without notice.
            </p>
          </section>

          <section>
            <h2 className="text-base font-medium text-hitl-text mb-3">5. Data Handling</h2>
            <p>
              Request content, choices, and metadata are stored to fulfill the service and may
              be retained for operational purposes (debugging, abuse prevention). We do not
              sell your data. Webhook payloads are delivered to callback URLs you configure;
              you are responsible for the security of your webhook endpoints.
            </p>
          </section>

          <section>
            <h2 className="text-base font-medium text-hitl-text mb-3">6. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, MeatSpace and its operators shall not be
              liable for any indirect, incidental, special, consequential, or punitive damages,
              or any loss of profits or revenues, whether incurred directly or indirectly, or
              any loss of data, use, goodwill, or other intangible losses.
            </p>
          </section>

          <section>
            <h2 className="text-base font-medium text-hitl-text mb-3">7. Changes</h2>
            <p>
              We may update these terms at any time. Continued use after changes constitutes
              acceptance. Material changes will be communicated via the email associated with
              your API key, if available.
            </p>
          </section>

          <section>
            <h2 className="text-base font-medium text-hitl-text mb-3">8. Contact</h2>
            <p>
              Questions about these terms? Reach out via the contact information on our website.
            </p>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-hitl-border">
          <a href="/" className="text-sm text-hitl-accent hover:underline">Back to home</a>
        </div>
      </div>
    </main>
  );
}
