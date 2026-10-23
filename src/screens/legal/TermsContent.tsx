import { Link } from 'react-router';
import { LEGAL_ROUTES } from '../../app/routes';
import { ContactLink, LegalList, LegalParagraph, LegalSection, legalLinkClass } from './LegalBlocks';

export function TermsContent() {
  return (
    <>
      <LegalSection title="Agreement">
        <LegalParagraph>
          By creating an account or using Ron&apos;s Mandarin you agree to these terms and to our{' '}
          <Link to={LEGAL_ROUTES.privacy} className={legalLinkClass}>Privacy Policy</Link>. If you do not
          agree, please do not use the app.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Beta service">
        <LegalParagraph>
          Ron&apos;s Mandarin is in an invite-only beta for Shu-Te University students and is provided &quot;as is&quot; and &quot;as available&quot;. Features can
          change or break, content can contain mistakes, and the service may be interrupted or reset. We give
          no warranty that it will be error-free, always available, or fit for a particular purpose.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Your account">
        <LegalParagraph>
          You must be 18 or older. You sign in with your Shu-Te University Google account; access ends if that
          account is no longer accepted. Keep your account secure and tell us if you suspect misuse. You can
          delete your account at any time in Settings, then Account.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Acceptable use">
        <LegalParagraph>Please do not:</LegalParagraph>
        <LegalList
          items={[
            'scrape, copy in bulk, share, or resell the app, its audio, or its lesson content;',
            'use the app’s content to train or test AI models, or to build a competing product;',
            'create accounts automatically or use bots or scripts against the app;',
            'try to get around usage limits, rate limits, or other protections;',
            'probe, attack, or overload the service, or access other people’s data;',
            'use the app for anything unlawful.',
          ]}
        />
      </LegalSection>

      <LegalSection title="Your content">
        <LegalParagraph>
          The folders and flashcards you create are yours. You give us permission to store and process them
          only to run the app for you. Do not store content you do not have the right to use.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Course content">
        <LegalParagraph>
          The app follows the 時代華語 Modern Chinese textbooks and is meant for students who own them. Material
          from the books stays the property of its publisher and authors; you may use it in the app for your own
          study only. Ron&apos;s Mandarin is not affiliated with or endorsed by the publisher. Third-party data,
          audio and fonts are listed with their licenses on the{' '}
          <Link to={LEGAL_ROUTES.credits} className={legalLinkClass}>Credits</Link> page; those licenses still apply
          to that material.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Ending your access">
        <LegalParagraph>
          We may suspend or end accounts that break these terms or put the service at risk, and we may end the
          beta or the service with reasonable notice. You can stop using Ron&apos;s Mandarin and delete your account at
          any time.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Price and tips">
        <LegalParagraph>
          Ron&apos;s Mandarin is free during the beta. Tips are voluntary gifts to support development: they do not
          buy content, unlock features or create any extra obligation, and they are not refundable except where
          the law requires. We may introduce paid plans later; they would come with separate terms that you
          would need to accept.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Limit of liability">
        <LegalParagraph>
          To the extent the law allows, Ron&apos;s Mandarin and its operator are not liable for indirect or consequential
          losses, lost progress or data, or for results you get from your studies. Back up what matters to you
          with the in-app data download.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Governing law and changes">
        <LegalParagraph>
          These terms are governed by the laws of the Republic of the Philippines. We may update them as the
          beta evolves; the effective date above shows the latest version, and continuing to use the app after
          a change means you accept it.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Contact">
        <LegalParagraph>
          Questions about these terms: <ContactLink />.
        </LegalParagraph>
      </LegalSection>
    </>
  );
}
