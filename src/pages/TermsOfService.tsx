import { Link } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";
import type { LegacyTheme } from "@/types/theme";

export default function TermsOfService() {
  const { legacyTheme } = useTheme();
  const theme: LegacyTheme = legacyTheme ?? {
    cursor: "#3cb5ee",
    defaultText: "#4b5563",
    upcomingText: "#4b5563",
    correctText: "#d1d5db",
    incorrectText: "#ef4444",
    buttonUnselected: "#3cb5ee",
    buttonSelected: "#0097b2",
    backgroundColor: "#323437",
    surfaceColor: "#2c2e31",
    ghostCursor: "#a855f7",
  };

  return (
    <div
      className="min-h-[100dvh] font-mono px-4 py-12 transition-colors duration-300"
      style={{
        backgroundColor: theme.backgroundColor,
        color: theme.correctText,
      }}
    >
      <div className="w-full max-w-3xl mx-auto animate-fade-in">
        <div className="mb-6">
          <Link
            to="/"
            className="transition text-sm hover:opacity-100"
            style={{ color: theme.defaultText, opacity: 0.7 }}
          >
            ← Back to Homepage
          </Link>
        </div>

        <div className="text-center mb-12">
          <h1
            className="text-4xl font-bold mb-2"
            style={{ color: theme.cursor }}
          >
            Terms of Service
          </h1>
          <p style={{ color: theme.defaultText }}>
            Last updated: January 15, 2026
          </p>
        </div>

        <div
          className="space-y-8 text-sm leading-relaxed"
          style={{ color: theme.defaultText }}
        >
          <section>
            <h2
              className="text-xl font-semibold mb-4"
              style={{ color: theme.correctText }}
            >
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing and using TypeSetGo, you accept and agree to be bound
              by these Terms of Service. If you do not agree to these terms, you
              should not use our service.
            </p>
          </section>

          <section>
            <h2
              className="text-xl font-semibold mb-4"
              style={{ color: theme.correctText }}
            >
              2. Description of Service
            </h2>
            <p>
              TypeSetGo is a typing practice and improvement platform that
              allows users to practice typing, track their progress, and compete
              with others in real-time multiplayer sessions. The service is
              provided &quot;as is&quot; and may be updated or modified at any
              time.
            </p>
          </section>

          <section>
            <h2
              className="text-xl font-semibold mb-4"
              style={{ color: theme.correctText }}
            >
              3. User Conduct
            </h2>
            <p className="mb-3">When using TypeSetGo, you agree to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Use the service for lawful purposes only</li>
              <li>
                Not attempt to cheat, manipulate, or artificially inflate typing
                statistics
              </li>
              <li>
                Not interfere with or disrupt the service or servers connected
                to the service
              </li>
              <li>
                Not use automated tools, bots, or scripts to interact with the
                service
              </li>
              <li>
                Respect other users in multiplayer sessions and maintain
                appropriate conduct
              </li>
            </ul>
          </section>

          <section>
            <h2
              className="text-xl font-semibold mb-4"
              style={{ color: theme.correctText }}
            >
              4. Intellectual Property
            </h2>
            <p>
              All content, features, and functionality of TypeSetGo, including
              but not limited to text, graphics, logos, and software, are the
              property of TypeSetGo and are protected by copyright, trademark,
              and other intellectual property laws.
            </p>
          </section>

          <section>
            <h2
              className="text-xl font-semibold mb-4"
              style={{ color: theme.correctText }}
            >
              5. User Data
            </h2>
            <p>
              Your use of TypeSetGo is also governed by our Privacy Policy.
              Please review our{" "}
              <Link
                to="/privacy"
                className="underline hover:opacity-100 transition"
                style={{ color: theme.cursor }}
              >
                Privacy Policy
              </Link>{" "}
              to understand how we collect, use, and protect your information.
            </p>
          </section>

          <section>
            <h2
              className="text-xl font-semibold mb-4"
              style={{ color: theme.correctText }}
            >
              6. Disclaimer of Warranties
            </h2>
            <p>
              TypeSetGo is provided &quot;as is&quot; and &quot;as
              available&quot; without any warranties of any kind, either express
              or implied. We do not guarantee that the service will be
              uninterrupted, secure, or error-free.
            </p>
          </section>

          <section>
            <h2
              className="text-xl font-semibold mb-4"
              style={{ color: theme.correctText }}
            >
              7. Limitation of Liability
            </h2>
            <p>
              In no event shall TypeSetGo be liable for any indirect,
              incidental, special, consequential, or punitive damages arising
              out of or related to your use of the service.
            </p>
          </section>

          <section>
            <h2
              className="text-xl font-semibold mb-4"
              style={{ color: theme.correctText }}
            >
              8. Modifications to Service
            </h2>
            <p>
              We reserve the right to modify, suspend, or discontinue any part
              of the service at any time without prior notice. We will not be
              liable to you or any third party for any modification, suspension,
              or discontinuation of the service.
            </p>
          </section>

          <section>
            <h2
              className="text-xl font-semibold mb-4"
              style={{ color: theme.correctText }}
            >
              9. Changes to Terms
            </h2>
            <p>
              We may revise these Terms of Service at any time. By continuing to
              use TypeSetGo after changes become effective, you agree to be
              bound by the revised terms.
            </p>
          </section>

          <section>
            <h2
              className="text-xl font-semibold mb-4"
              style={{ color: theme.correctText }}
            >
              10. Contact Information
            </h2>
            <p>
              If you have any questions about these Terms of Service, please
              contact us through our official channels.
            </p>
          </section>
        </div>

      </div>
    </div>
  );
}
