import { Link } from "react-router-dom";
import {
  ChatCircleDotsIcon, CopyrightIcon, HandshakeIcon, KeyboardIcon, LockIcon, NotePencilIcon, ScalesIcon, ScrollIcon, SmileyIcon, WarningCircleIcon, WrenchIcon,
} from "@phosphor-icons/react";
import { LegalPage, type LegalSection } from "@/components/legal/LegalPage";

const SECTIONS: LegalSection[] = [
  {
    id: "acceptance-of-terms",
    title: "Acceptance of Terms",
    Icon: HandshakeIcon,
    short: "Using TypeSetGo means you agree to these terms.",
    body: (
      <p>
        By accessing and using TypeSetGo, you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, you should
        not use our service.
      </p>
    ),
  },
  {
    id: "description-of-service",
    title: "Description of Service",
    Icon: KeyboardIcon,
    short: "TypeSetGo is a place to practise typing, track your progress and race others. It can change over time.",
    body: (
      <p>
        TypeSetGo is a typing practice and improvement platform that allows users to practice typing, track their progress, and compete with others
        in real-time multiplayer sessions. The service is provided &quot;as is&quot; and may be updated or modified at any time.
      </p>
    ),
  },
  {
    id: "user-conduct",
    title: "User Conduct",
    Icon: SmileyIcon,
    short: "Play fair: no cheating, bots or breaking things, and be kind to others in multiplayer.",
    body: (
      <>
        <p>When using TypeSetGo, you agree to:</p>
        <ul>
          <li>Use the service for lawful purposes only</li>
          <li>Not attempt to cheat, manipulate, or artificially inflate typing statistics</li>
          <li>Not interfere with or disrupt the service or servers connected to the service</li>
          <li>Not use automated tools, bots, or scripts to interact with the service</li>
          <li>Respect other users in multiplayer sessions and maintain appropriate conduct</li>
        </ul>
      </>
    ),
  },
  {
    id: "intellectual-property",
    title: "Intellectual Property",
    Icon: CopyrightIcon,
    short: "TypeSetGo's text, graphics, logos and software belong to TypeSetGo.",
    body: (
      <p>
        All content, features, and functionality of TypeSetGo, including but not limited to text, graphics, logos, and software, are the property of
        TypeSetGo and are protected by copyright, trademark, and other intellectual property laws.
      </p>
    ),
  },
  {
    id: "user-data",
    title: "User Data",
    Icon: LockIcon,
    short: "How your information is handled is explained in the Privacy Policy.",
    body: (
      <p>
        Your use of TypeSetGo is also governed by our Privacy Policy. Please review our{" "}
        <Link to="/privacy" className="text-foreground underline underline-offset-4">Privacy Policy</Link>{" "}
        to understand how we collect, use, and protect your information.
      </p>
    ),
  },
  {
    id: "disclaimer-of-warranties",
    title: "Disclaimer of Warranties",
    Icon: WarningCircleIcon,
    short: "TypeSetGo comes as it is, with no promise that it will always work perfectly.",
    body: (
      <p>
        TypeSetGo is provided &quot;as is&quot; and &quot;as available&quot; without any warranties of any kind, either express or implied. We do
        not guarantee that the service will be uninterrupted, secure, or error-free.
      </p>
    ),
  },
  {
    id: "limitation-of-liability",
    title: "Limitation of Liability",
    Icon: ScalesIcon,
    short: "TypeSetGo is not responsible for indirect harm that comes from using it.",
    body: (
      <p>
        In no event shall TypeSetGo be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to
        your use of the service.
      </p>
    ),
  },
  {
    id: "modifications-to-service",
    title: "Modifications to Service",
    Icon: WrenchIcon,
    short: "Any part of TypeSetGo can change or stop at any time, without warning.",
    body: (
      <p>
        We reserve the right to modify, suspend, or discontinue any part of the service at any time without prior notice. We will not be liable to
        you or any third party for any modification, suspension, or discontinuation of the service.
      </p>
    ),
  },
  {
    id: "changes-to-terms",
    title: "Changes to Terms",
    Icon: NotePencilIcon,
    short: "These terms can change. Using TypeSetGo after a change means you accept the new terms.",
    body: (
      <p>
        We may revise these Terms of Service at any time. By continuing to use TypeSetGo after changes become effective, you agree to be bound by the
        revised terms.
      </p>
    ),
  },
  {
    id: "contact-information",
    title: "Contact Information",
    Icon: ChatCircleDotsIcon,
    short: "Questions? Reach out through our official channels.",
    body: <p>If you have any questions about these Terms of Service, please contact us through our official channels.</p>,
  },
];

export default function TermsOfService() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="January 15, 2026"
      intro="The rules for using TypeSetGo: what it is, how to play fair, and what we can and can't promise."
      Icon={ScrollIcon}
      sections={SECTIONS}
      other={{ to: "/privacy", label: "Read the Privacy Policy" }}
    />
  );
}
