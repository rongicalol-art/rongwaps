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
          Ron&apos;s Mandarin is in open beta and provided &quot;as is&quot; and &quot;as available&quot;. Features can
          change or break, content can contain mistakes, and the service may be interrupted or reset. We give
          no warranty that it will be error-free, always available, or fit for a particular purpose.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Your account">
        <LegalParagraph>
          You sign in with Google. Keep your account secure and tell us if you suspect misuse. You can delete
          your account at any time in Settings, then Account.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Acceptable use">
        <LegalParagraph>Please do not:</LegalParagraph>
        <LegalList
          items={[
            'scrape, copy in bulk, or resell the app, its audio, or its lesson content;',
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

      <LegalSection title="Pronunciation audio credits">
        <LegalParagraph>
          Additional character pronunciation recordings: Taiwan Ministry of Digital Affairs, 2025,{' '}
          <a href="https://www.cns11643.gov.tw" className={legalLinkClass}>CNS11643 Chinese Standard Interchange Code — audio files</a>.{' '}
          These recordings are released under the{' '}
          <a href="https://data.gov.tw/license" className={legalLinkClass}>Open Government Data License, version 1.0</a>{' '}
          and may be reused under its terms. Original neutral-tone WAVs were transcoded to MP3. The app&apos;s usage restrictions do not override that license.
        </LegalParagraph>
        <LegalParagraph>
          Supplemental 團圓 pronunciation: Yue Tan / Shtooka Project, 2009, via{' '}
          <a href="https://commons.wikimedia.org/wiki/File:Zh-tu%C3%A1nyu%C3%A1n.ogg" className={legalLinkClass}>Wikimedia Commons</a>,{' '}
          licensed under <a href="https://creativecommons.org/licenses/by-sa/3.0/us/" className={legalLinkClass}>CC BY-SA 3.0 US</a>.
          The original Ogg was transcoded to MP3; the recording remains available under that license.
        </LegalParagraph>
        <LegalParagraph>
          Six supplemental word recordings were generated locally with the preset Vivian voice from{' '}
          <a href="https://huggingface.co/Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice" className={legalLinkClass}>Qwen3-TTS</a>,{' '}
          whose model is released under Apache 2.0. No textbook recording was replaced or used for voice cloning.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Fair-use limits">
        <LegalParagraph>
          Neural audio and AI answer grading cost us money per use, so they have per-minute and daily limits
          for each account. When you reach a limit, the app falls back to simpler options (such as your
          browser&apos;s voice or exact-match checking) until it resets. Limits may change during the beta.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Ending your access">
        <LegalParagraph>
          We may suspend or end accounts that break these terms or put the service at risk, and we may end the
          beta or the service with reasonable notice. You can stop using Ron&apos;s Mandarin and delete your account at
          any time.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Paid plans">
        <LegalParagraph>
          Ron&apos;s Mandarin is free during the beta. We may introduce paid plans later; they would come with separate
          terms that you would need to accept.
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
