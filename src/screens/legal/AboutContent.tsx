import { Link } from 'react-router';
import { LEGAL_ROUTES } from '../../app/routes';
import { ContactLink, LegalList, LegalParagraph, LegalSection, LegalSummary, legalLinkClass } from './LegalBlocks';

const SUMMARY = [
  'Ron\'s Mandarin 是配合《時代華語》課本使用的免費學習 App，由學習中文的 Ron 個人開發。',
  '課文對話邊聽邊讀：每個字隨錄音亮起，點任何詞就有拼音和意思。',
  '字形拆解加上記憶法，幫你記住每個字的意思。',
  '課後有 TOCFL 模擬測驗，答錯的字會回到你的複習卡片。',
  '正體字、台灣發音。年滿 18 歲、有 Google 帳號就能加入，第一至三冊免費使用。',
];

export function AboutContent() {
  return (
    <>
      <LegalSummary points={SUMMARY} />

      <LegalSection title="What it is">
        <LegalParagraph>
          Ron&apos;s Mandarin is a free study app for the <strong>時代華語 Modern Chinese</strong> textbooks. It
          turns each lesson into practice you can do on your phone: listen and read, learn the characters, review
          the words, then test yourself the way TOCFL will.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="What makes it different">
        <LegalList
          items={[
            <><strong>Read along with the audio.</strong> Every dialogue and reading in Books 1 to 3 plays its recording while each character lights up as it is spoken. Tap any word for its pinyin and meaning.</>,
            <><strong>Memory hooks.</strong> Each character is split into its parts, with a short story that ties the parts to the meaning: 她 is a 女 (woman) waving a 也 flag, so &ldquo;she&rdquo;.</>,
            <><strong>A TOCFL mock test after the lesson.</strong> Listening and reading, built like the real exam. A Fix round goes through every miss, the words you missed come back in your reviews, and retakes bring back earlier lessons you got wrong. Ready for Book 1 and the first lessons of Book 3, with more on the way.</>,
            <><strong>Flashcards that know when you&apos;ll forget.</strong> Every lesson word, scheduled with FSRS so each review comes just before you would forget it.</>,
            <><strong>Study together.</strong> See who else is studying, race each other in quick quizzes and chat. You can hide yourself any time in Settings.</>,
          ]}
        />
      </LegalSection>

      <LegalSection title="Also inside">
        <LegalList
          items={[
            'Writing practice with stroke order for every character.',
            'Tone practice, and quizzes that always test the meaning.',
            'Grammar explanations with exercises, from fill-in to ordering and listening.',
            'A dictionary that knows your book, and your own cards in folders, synced across devices.',
            'TOCFL levels on every word, and a readiness view of how close you are to each band.',
          ]}
        />
      </LegalSection>

      <LegalSection title="Use it with your book">
        <LegalParagraph>
          The app is made to be used with your own copy of the book, so please buy it. It follows the book&apos;s
          lessons and adds the things paper cannot do. Keep using the book in class; the app is for practice.
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
          The beta is open to anyone 18 or older with a Google account. Books 1 to 3 are open now; Book 4 will open
          when it is ready. Things may change or break, and your feedback decides what gets built next.
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
          I&apos;m Ron, a student learning Mandarin in Taiwan from these same books. I built this because I wanted
          more practice from my book than the book alone could give. The app is free; tips are welcome but never
          required.
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
