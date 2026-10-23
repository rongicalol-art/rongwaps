import { Link } from 'react-router';
import { LEGAL_ROUTES } from '../../app/routes';
import { ContactLink, LegalList, LegalParagraph, LegalSection, LegalSummary, legalLinkClass } from './LegalBlocks';

const SUMMARY = [
  '本服務由個人開發者 Ron 在台灣經營，目前為僅限樹德科技大學學生的封閉測試版。',
  '使用者須年滿 18 歲，並以學校 Google 帳號登入；一人一帳號，不得共用或轉讓。',
  '本 App 配合《時代華語》教材使用，供已購買課本的學生個人學習；課本內容之著作權屬原出版社及作者。',
  '禁止大量下載、轉載、販售內容，或將內容用於訓練人工智慧模型。',
  '測試期間免費，打賞完全自願，不會解鎖任何內容。',
  '連續 12 個月未登入的帳號將被刪除。',
  '本條款以中華民國（台灣）法律為準據法，並以臺灣高雄地方法院為第一審管轄法院。',
];

export function TermsContent() {
  return (
    <>
      <LegalSummary points={SUMMARY} />

      <LegalSection title="1. Who we are">
        <LegalParagraph>
          Ron&apos;s Mandarin (&quot;the app&quot;, &quot;we&quot;, &quot;us&quot;) is run by Ron, an individual
          developer based in Taiwan. It is not a company, and it is not run by any school or publisher. You can
          reach us at <ContactLink />.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="2. Agreement">
        <LegalParagraph>
          These terms are a contract between you and us. By signing in or using the app you agree to them and to
          our <Link to={LEGAL_ROUTES.privacy} className={legalLinkClass}>Privacy Policy</Link>. If you do not
          agree, please do not use the app.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="3. Who can use it">
        <LegalList
          items={[
            'You must be 18 or older.',
            'During the beta, you must sign in with a Shu-Te University student Google account. Your access ends if that account is closed or no longer accepted.',
            'One person per account. Do not share your sign-in, let others use your account, or sell or transfer it.',
            'The app is meant for people who own the 時代華語 Modern Chinese textbook it follows.',
          ]}
        />
      </LegalSection>

      <LegalSection title="4. The beta">
        <LegalParagraph>
          The app is an early, invite-only test version. Features can change, break or be removed; lessons may
          contain mistakes; and the service may be paused or reset. We may limit which books and lessons are
          open. We will try to warn you before anything that affects your saved progress.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="5. Your account">
        <LegalList
          items={[
            'You sign in through Google; we never see your Google password. Keep your Google account secure and tell us right away if you think someone else is using yours.',
            'You are responsible for what happens under your account.',
            'You can download your data or delete your account at any time in Settings, then Account.',
            'Accounts with no sign-in for 12 months are deleted, together with their progress, folders and cards. Where we can, we will warn you first.',
          ]}
        />
      </LegalSection>

      <LegalSection title="6. The textbook and course content">
        <LegalParagraph>
          The app follows 時代華語 Modern Chinese, edited by the Tamkang University Chinese Language Center and
          published by Cheng Chung Book Co. Lesson texts, vocabulary, grammar examples, page images and recordings
          taken from the book belong to their publisher and authors. We provide them only so that students who
          own the book can study with it, and you may use them only for your own study inside the app.
        </LegalParagraph>
        <LegalParagraph>
          Ron&apos;s Mandarin is not affiliated with, approved or endorsed by the publisher or the editors. If a rights
          holder asks us to change or remove material, we may do so without notice.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="7. What we own">
        <LegalParagraph>
          Apart from the textbook material and the third-party material listed on{' '}
          <Link to={LEGAL_ROUTES.sources} className={legalLinkClass}>Sources &amp; Licenses</Link>, the app and
          everything we made for it belong to us. That includes the code, design, illustrations, memory hooks,
          character explanations, exercises, sentence recordings we produced, and how all of it is selected and
          arranged.
        </LegalParagraph>
        <LegalParagraph>
          We give you a personal, non-transferable, revocable permission to use the app for your own learning
          while these terms are in force. Open-licensed material keeps its own license, and nothing in these terms
          takes away the rights that license gives you.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="8. Acceptable use">
        <LegalParagraph>Please do not:</LegalParagraph>
        <LegalList
          items={[
            'copy, download in bulk, scrape, record, republish, share or sell the app’s lessons, audio, images or data;',
            'use any of the app’s content to train, fine-tune or test AI models, or to build a competing product;',
            'share screenshots or exports of whole lessons publicly (a few lines for study notes or a question is fine);',
            'use bots, scripts or automated tools against the app, or create accounts automatically;',
            'get around sign-in, lesson locks, usage limits, rate limits or other protections;',
            'reverse engineer the app except where the law allows it;',
            'probe, attack or overload the service, or try to access other people’s data;',
            'upload harmful code, or use the app for anything unlawful, abusive or harassing.',
          ]}
        />
      </LegalSection>

      <LegalSection title="9. Your content">
        <LegalParagraph>
          The folders and flashcards you create are yours. You give us permission to store, copy and display them
          only to run the app for you, for example to sync them between your devices. Only add content you have
          the right to use. We may remove content that breaks these terms.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="10. Feedback">
        <LegalParagraph>
          We love hearing ideas and bug reports. If you send us feedback or suggestions, we may use them to
          improve the app freely, without paying you or crediting you.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="11. Learning results">
        <LegalParagraph>
          The app is a study aid, not a replacement for your teacher or your book. Content can contain mistakes:
          check with your teacher if something looks wrong, and please tell us. Some recordings are generated by
          a text-to-speech model rather than recorded by a person. TOCFL levels and readiness scores are estimates;
          we do not promise any grade, test score or result.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="12. Copyright concerns">
        <LegalParagraph>
          If you believe something in the app infringes your rights, email <ContactLink /> with: who you are, the
          work concerned, where it appears in the app, and how to contact you. We will reply promptly and, where
          appropriate, remove or change the material.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="13. Other services">
        <LegalParagraph>
          The app relies on other services, including Google (sign-in), Supabase (database), Cloudflare (file
          storage) and Sentry (error reports). Their own terms apply to their services. Links to outside websites
          are for convenience; we are not responsible for their content.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="14. Price and tips">
        <LegalParagraph>
          The app is free during the beta. If we offer a way to tip, tips are voluntary gifts to support
          development. They do not buy content, unlock features, or create any extra obligation for us, and they
          are not refundable except where the law requires. Any tip platform we use has its own terms. If we
          introduce paid plans later, they will come with separate terms you would need to accept first.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="15. Ending your access">
        <LegalParagraph>
          You can stop using the app and delete your account at any time. We may suspend or close an account that
          breaks these terms or puts the service, other users or the content at risk; where reasonable we will
          tell you why. We may end the beta or the whole service; if we do, we will give at least 30 days&apos; notice
          in the app so you can download your data. Sections 6 to 8, 10, 11, 16 and 17 continue to apply after
          your access ends.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="16. Disclaimers and limit of liability">
        <LegalParagraph>
          The app is provided free, &quot;as is&quot; and &quot;as available&quot;. To the extent the law allows, we give no
          warranty that it will be error-free, uninterrupted, secure or fit for a particular purpose, and we are
          not liable for indirect or consequential losses, lost progress or data, or the results of your studies.
          Please download your data now and then if it matters to you.
        </LegalParagraph>
        <LegalParagraph>
          Nothing in these terms limits liability that cannot be limited by law, such as liability for intentional
          acts or gross negligence under the Civil Code of Taiwan, or any right you have under consumer protection
          law that cannot be waived.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="17. Governing law and disputes">
        <LegalParagraph>
          These terms are governed by the laws of the Republic of China (Taiwan). If a dispute arises, please
          email us first; most problems can be fixed quickly. If it cannot be resolved, the Taiwan Kaohsiung
          District Court has jurisdiction as the court of first instance. If you live in the Philippines, you also
          keep the protections Philippine law gives you that cannot be excluded by contract, including under the
          Data Privacy Act of 2012.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="18. Changes to these terms">
        <LegalParagraph>
          We may update these terms as the app grows. The effective date above always shows the current version.
          For meaningful changes we will show a notice in the app at least 7 days before they take effect. If you
          keep using the app after that, you accept the new terms; if you do not agree, you can delete your
          account.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="19. General">
        <LegalList
          items={[
            'These terms and the Privacy Policy are the whole agreement between you and us about the app.',
            'If part of these terms is found invalid, the rest still applies.',
            'If we do not enforce a term right away, we can still enforce it later.',
            'You may not transfer your rights under these terms. We may transfer ours if the app is handed to a new operator, and we will tell you in the app if that happens.',
            'The Chinese summary at the top is for convenience. If it differs from the English text, the English text controls.',
          ]}
        />
      </LegalSection>

      <LegalSection title="20. Contact">
        <LegalParagraph>
          Questions about these terms: <ContactLink />.
        </LegalParagraph>
      </LegalSection>
    </>
  );
}
