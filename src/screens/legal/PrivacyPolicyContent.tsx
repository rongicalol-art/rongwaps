import { Link } from 'react-router';
import { LEGAL_ROUTES } from '../../app/routes';
import { ContactLink, LegalList, LegalParagraph, LegalSection, legalLinkClass } from './LegalBlocks';

/**
 * Describes what the app and server do today. When code changes what is
 * collected or which providers receive data, update this page in the same change.
 */
export function PrivacyPolicyContent() {
  return (
    <>
      <LegalSection title="Who we are">
        <LegalParagraph>
          RongWaps is a Chinese-learning web app, currently in open beta. This policy explains what
          data it handles and why. Questions or requests: <ContactLink />.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="What we collect">
        <LegalList
          items={[
            <>
              <strong>Account:</strong> your email address, plus your name and profile picture from your
              Google account, kept only in your sign-in record. Sign-in goes through Google and Supabase; we
              never see your Google password.
            </>,
            <>
              <strong>Learning data:</strong> which cards you have learned, their review schedule, and your
              synced settings (favorites, selected book and lessons, character style).
            </>,
            <>
              <strong>Your content:</strong> the folders and custom flashcards you create.
            </>,
            <>
              <strong>Technical data:</strong> like any website, our servers and hosting providers see your IP
              address and basic device and browser details when you use the app.
            </>,
          ]}
        />
        <LegalParagraph>
          Some progress, such as grammar lesson completion, stays only on your device. We do not collect your
          location, contacts, or payment details, and the app has no analytics or advertising trackers.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="How we use it">
        <LegalParagraph>
          To run your account, sync your progress between devices, play audio, grade your answers, prevent
          abuse (we apply usage limits per account), and answer your questions. We do not sell your data, show
          ads, or build advertising profiles.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Where it is stored and who processes it">
        <LegalList
          items={[
            <>
              <strong>Supabase</strong> hosts your account and learning data in India (Mumbai, ap-south-1).
              Each account can read only its own rows.
            </>,
            <>
              <strong>Google</strong> handles the sign-in step.
            </>,
            <>
              <strong>Microsoft</strong> text-to-speech: when you play neural audio, the word or sentence
              (up to 500 characters) is sent from our server to Microsoft to be turned into speech. Your
              name and email are not sent. The resulting audio is cached and reused for everyone.
            </>,
            <>
              <strong>TypeSafe</strong> (AI grading): when a free-text answer is graded, your typed answer
              and the expected answer are sent to TypeSafe&apos;s API. Your name and email are not sent.
            </>,
            <>
              <strong>Cloudflare R2</strong> may store audio files and lesson content. They contain no
              personal data.
            </>,
            <>
              <strong>Public CDNs</strong> (jsDelivr, unpkg, GitHub): for handwriting practice on characters
              outside the course, the app may fetch stroke data from these. They see your IP address and the
              character requested.
            </>,
            <>
              <strong>Our web host</strong> serves the app and may keep standard server logs.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection title="Data on your device">
        <LegalParagraph>
          The app stores your sign-in session, a copy of your progress and settings (so it works offline),
          and cached lessons and audio in your browser (local storage, IndexedDB, Cache Storage and a service
          worker). We set no advertising or tracking cookies. Clearing your site data removes all of this
          from the device.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="How long we keep it">
        <LegalParagraph>
          We keep your account data until you delete your account. Deleting it in the app removes your
          profile, progress, folders and cards from our database right away. Our database provider may keep
          routine backups for a limited time afterward. Cached audio is stored by text, not by user, so it is
          not linked to you.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Your rights">
        <LegalParagraph>
          Under the Philippine Data Privacy Act of 2012 (Republic Act 10173) you can access, correct, delete
          and take a copy of your personal data, and object to how it is used. In the app, open Settings,
          then Account, to <strong>download your data</strong> as a JSON file or <strong>delete your
          account</strong>. For anything else, email <ContactLink />. You may also complain to the Philippine
          National Privacy Commission.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Children">
        <LegalParagraph>
          RongWaps is not directed at children under 13 and we do not knowingly collect their data. If you
          believe a child has given us data, email us and we will delete it.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Changes">
        <LegalParagraph>
          This is a beta, so this policy may change. We will update the effective date above and, for
          meaningful changes, tell you in the app. See also our{' '}
          <Link to={LEGAL_ROUTES.terms} className={legalLinkClass}>Terms of Service</Link>.
        </LegalParagraph>
      </LegalSection>
    </>
  );
}
