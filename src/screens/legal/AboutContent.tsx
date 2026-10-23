import { Link } from 'react-router';
import { LEGAL_ROUTES } from '../../app/routes';
import { ContactLink, LegalList, LegalParagraph, LegalSection, LegalSummary, legalLinkClass } from './LegalBlocks';

const SUMMARY = [
  'Ron\'s Mandarin 是配合《時代華語》課本使用的學習 App，由學習中文的 Ron 個人開發。',
  '提供間隔重複字卡、字形拆解與記憶法、寫字、聽力、閱讀與語法練習。',
  '使用正體字與台灣發音，程度對應 TOCFL（華語文能力測驗）。',
  '目前僅開放樹德科技大學學生測試第一冊第 1 至 8 課，免費使用。',
];

export function AboutContent() {
  return (
    <>
      <LegalSummary points={SUMMARY} />

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

      <LegalSection title="What's inside">
        <LegalList
          items={[
            <><strong>Flashcards</strong> for every lesson word, scheduled with FSRS so reviews come just before you would forget.</>,
            <><strong>Character breakdowns</strong> that show the parts of each character, which part gives the sound, and a memory hook.</>,
            <><strong>Writing practice</strong> with stroke order for every character.</>,
            <><strong>Listening and reading</strong> with the book&apos;s dialogues, audio on every word, and tap-to-look-up.</>,
            <><strong>Grammar</strong> explanations with exercises in several formats, from fill-in to ordering and listening.</>,
            <><strong>Dictionary and your own cards</strong>, saved into folders and synced across devices.</>,
            <><strong>TOCFL levels</strong> on every word, and a readiness view of how close you are to each band.</>,
          ]}
        />
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

      <LegalSection title="Your data">
        <LegalParagraph>
          No ads, no trackers, nothing sold. Your progress is stored so it can sync between your devices, and you
          can download it or delete your account any time in Settings. Details are in the{' '}
          <Link to={LEGAL_ROUTES.privacy} className={legalLinkClass}>Privacy Policy</Link>.
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
          <Link to={LEGAL_ROUTES.sources} className={legalLinkClass}>Sources &amp; Licenses</Link>,{' '}
          <Link to={LEGAL_ROUTES.terms} className={legalLinkClass}>Terms</Link> and{' '}
          <Link to={LEGAL_ROUTES.privacy} className={legalLinkClass}>Privacy Policy</Link>.
        </LegalParagraph>
      </LegalSection>
    </>
  );
}
