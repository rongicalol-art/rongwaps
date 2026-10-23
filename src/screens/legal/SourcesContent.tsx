import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { LEGAL_ROUTES } from '../../app/routes';
import { ContactLink, LegalList, LegalParagraph, LegalSection, LegalSummary, legalLinkClass } from './LegalBlocks';

const SUMMARY = [
  '本頁列出 App 使用的所有外部內容來源及其授權條款。',
  '課程內容依循《時代華語》（淡江大學華語中心編著，正中書局出版），課本素材之著作權屬原權利人；本 App 與出版社無隸屬或背書關係。',
  '其他音檔、字形資料、字型、圖示與程式庫均依各自的開放授權使用，相關授權不受本 App 使用條款限制。',
  '權利人如有疑慮，請來信聯絡，我們會儘速處理。',
];

function Ext({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} className={legalLinkClass} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}

/**
 * Every third-party source the shipped app uses. When a pack, font, voice or
 * library with attribution terms is added, list it here in the same change.
 */
export function SourcesContent() {
  return (
    <>
      <LegalSummary points={SUMMARY} />

      <LegalParagraph>
        Ron&apos;s Mandarin is built on the work of many people. This page lists every outside source the app uses,
        who made it, and the license it is used under. Where a source has an open license, that license applies
        to that material, and nothing in our Terms limits the rights it gives you.
      </LegalParagraph>

      <LegalSection title="Textbook">
        <LegalParagraph>
          Lessons follow <strong>時代華語 Modern Chinese</strong>, Books 1 to 4, edited by the Tamkang University
          Chinese Language Center (淡江大學華語中心) and published by Cheng Chung Book Co. (正中書局). Lesson
          texts, vocabulary, grammar examples, page images and recordings from the book remain the property of
          their owners and are provided only to students who own the book. Ron&apos;s Mandarin is not affiliated
          with or endorsed by them.
        </LegalParagraph>
        <LegalParagraph>
          If you hold rights to any of this material and have a concern, email <ContactLink /> and we will
          respond promptly, including removing material where asked.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Pronunciation audio">
        <LegalParagraph>
          Additional character recordings: Taiwan Ministry of Digital Affairs, 2025,{' '}
          <Ext href="https://www.cns11643.gov.tw">CNS11643 Chinese Standard Interchange Code — audio files</Ext>,
          released under the <Ext href="https://data.gov.tw/license">Open Government Data License, version 1.0</Ext>.
          Original neutral-tone WAVs were transcoded to MP3. The app&apos;s usage restrictions do not override that
          license.
        </LegalParagraph>
        <LegalParagraph>
          Supplemental 團圓 recording: Yue Tan / Shtooka Project, 2009, via{' '}
          <Ext href="https://commons.wikimedia.org/wiki/File:Zh-tu%C3%A1nyu%C3%A1n.ogg">Wikimedia Commons</Ext>,
          licensed under <Ext href="https://creativecommons.org/licenses/by-sa/3.0/us/">CC BY-SA 3.0 US</Ext>.
          Transcoded from Ogg to MP3; the recording remains available under that license.
        </LegalParagraph>
        <LegalParagraph>
          Grammar example recordings and six supplemental word recordings were generated locally with the
          preset voices of <Ext href="https://huggingface.co/Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice">Qwen3-TTS</Ext>{' '}
          (Apache 2.0). No textbook recording was replaced or used for voice cloning.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Characters and words">
        <LegalList
          items={[
            <>
              Character decomposition data is derived from <Ext href="https://github.com/cjkvi/cjkvi-ids">CJKVI IDS</Ext>{' '}
              and <Ext href="https://gitlab.chise.org/CHISE/ids">CHISE</Ext> (GPL-2.0-or-later; portions derive from
              the CDP database by C.C. Hsieh and team, Academia Sinica) and{' '}
              <Ext href="https://github.com/skishore/makemeahanzi">Make Me a Hanzi</Ext> (LGPL-3.0-or-later, from
              Unihan © Unicode, Inc. and CJKlib). The generated pack is distributed under{' '}
              <Ext href="https://www.gnu.org/licenses/gpl-3.0.html">GPL-3.0-or-later</Ext>; full license texts and
              notices ship with it, and the derivation tooling is available on request.
            </>,
            <>
              Stroke order animation: <Ext href="https://hanziwriter.org">Hanzi Writer</Ext> by David Chanin (MIT).
              Its stroke data comes from Make Me a Hanzi and the Arphic PL fonts, under the{' '}
              <Ext href="https://github.com/chanind/hanzi-writer-data/blob/master/ARPHICPL.TXT">Arphic Public License</Ext>.
            </>,
            <>
              Readings draw on <Ext href="https://cc-cedict.org/wiki/">CC-CEDICT</Ext> (MDBG), licensed under{' '}
              <Ext href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</Ext>; the pronunciation
              data derived from it is shared under the same license.
            </>,
            <>
              Levels: the Taiwan Benchmarks for the Chinese Language (TBCL, 臺灣華語文能力基準) by the National
              Academy for Educational Research, via <Ext href="https://github.com/ivankra/tocfl">ivankra/tocfl</Ext>;
              gaps filled from the New HSK syllabus (2025) via{' '}
              <Ext href="https://github.com/Punpuf/hsk-syllabus-vocabulary-parser">Punpuf/hsk-syllabus-vocabulary-parser</Ext>{' '}
              and <Ext href="https://github.com/krmanik/HSK-3.0">krmanik/HSK-3.0</Ext>.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection title="Fonts">
        <LegalList
          items={[
            <>Nunito by Vernon Adams and contributors (SIL Open Font License 1.1).</>,
            <>jf open 粉圓 (Huninn) by justfont, based on Kosugi Maru by Motoya (SIL OFL 1.1).</>,
            <>Resource Han Rounded by CyanoHao, based on Source Han Sans by Adobe (SIL OFL 1.1).</>,
            <>LXGW WenKai by LXGW, based on Klee One by Fontworks (SIL OFL 1.1).</>,
            <>Taiwan Ministry of Education standard Kai font (教育部標準楷書).</>,
            <>Noto Sans CJK TC by Google and Adobe, and Plangothic, subset for rare characters (SIL OFL 1.1).</>,
          ]}
        />
        <LegalParagraph>Font files are subset for the web; their license texts ship alongside them.</LegalParagraph>
      </LegalSection>

      <LegalSection title="Icons, animations and software">
        <LegalList
          items={[
            <>Icons: <Ext href="https://phosphoricons.com">Phosphor Icons</Ext> (MIT), via react-icons (MIT).</>,
            <>Animations from <Ext href="https://lottiefiles.com">LottieFiles</Ext> creators, under the Lottie Simple License.</>,
            <>
              Review scheduling: the FSRS algorithm via{' '}
              <Ext href="https://github.com/open-spaced-repetition/ts-fsrs">ts-fsrs</Ext> (MIT).
            </>,
            <>
              Built with React, React Router, Vite, Tailwind CSS, Zustand, Motion, lottie-web, Express and
              Supabase, all open source. Thank you to everyone who makes them.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection title="What we made">
        <LegalParagraph>
          Everything not listed above was made for Ron&apos;s Mandarin: the app&apos;s code and design, illustrations,
          memory hooks, character explanations, practice exercises and the way lessons are arranged. These are
          not open-licensed; see the <Link to={LEGAL_ROUTES.terms} className={legalLinkClass}>Terms</Link>.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Missing something?">
        <LegalParagraph>
          If you made something the app uses and it is missing or credited wrongly here, email <ContactLink /> and
          we will fix it.
        </LegalParagraph>
      </LegalSection>
    </>
  );
}
