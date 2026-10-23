import { Link } from 'react-router';
import { LEGAL_ROUTES } from '../../app/routes';
import { ContactLink, LegalList, LegalParagraph, LegalSection, legalLinkClass } from './LegalBlocks';

export function AboutContent() {
  return (
    <>
      <LegalSection title="What it is">
        <LegalParagraph>
          Ron&apos;s Mandarin is a study companion for the <strong>時代華語 Modern Chinese</strong> textbook series.
          It turns each lesson into practice you can do anywhere: flashcards on a spaced-repetition schedule,
          character breakdowns and memory hooks, handwriting, listening, reading and grammar exercises.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Use it with your book">
        <LegalParagraph>
          The app is made for students who own the book. It follows the book&apos;s lessons and adds the
          things paper cannot do: audio on every word, reviews timed to when you are about to forget, and
          progress that syncs between your devices. Keep using the book in class; the app is for practice.
        </LegalParagraph>
        <LegalParagraph>
          Ron&apos;s Mandarin is an independent project. It is not made, approved or endorsed by Tamkang
          University&apos;s Chinese Language Center or by Cheng Chung Book Co.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="The Chinese it teaches">
        <LegalList
          items={[
            'Traditional characters, as in the book.',
            'Taiwan pronunciation first; where mainland China says a word differently, the app notes it.',
            'Levels follow TOCFL (Taiwan’s official test), so you can see how close you are to each band.',
          ]}
        />
      </LegalSection>

      <LegalSection title="Beta">
        <LegalParagraph>
          The beta is open to Shu-Te University students who sign in with their school Google account. Book 1,
          Lessons 1 to 8 are available now; later lessons and Books 2 to 4 will open as they are ready. Things
          may change or break, and your feedback decides what gets built next.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Who made it">
        <LegalParagraph>
          I&apos;m Ron, a Mandarin learner. I built this because I wanted more practice from my book than the
          book alone could give. The app is free; tips are welcome but never required.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Say hi">
        <LegalParagraph>
          Found a mistake, or want a feature? Email <ContactLink />. See also the{' '}
          <Link to={LEGAL_ROUTES.credits} className={legalLinkClass}>Credits</Link>,{' '}
          <Link to={LEGAL_ROUTES.terms} className={legalLinkClass}>Terms</Link> and{' '}
          <Link to={LEGAL_ROUTES.privacy} className={legalLinkClass}>Privacy Policy</Link>.
        </LegalParagraph>
      </LegalSection>
    </>
  );
}
