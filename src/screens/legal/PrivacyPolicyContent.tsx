import { Link } from 'react-router';
import { LEGAL_ROUTES } from '../../app/routes';
import { ContactLink, LegalList, LegalParagraph, LegalSection, LegalSummary, legalLinkClass } from './LegalBlocks';

const SUMMARY = [
  '個人資料蒐集者：個人開發者 Ron（台灣）。依《個人資料保護法》第 8 條告知如下。',
  '蒐集項目：學校電子郵件、Google 帳號名稱與頭像、學習紀錄、您建立的資料夾與字卡，以及基本技術資料。',
  '目的：提供與同步學習服務、帳號管理、防止濫用、改善教材（僅使用匿名統計）。',
  '期間與地區：保存至您刪除帳號，或連續 12 個月未登入為止；資料存放於印度（Supabase），並由下列服務商處理。',
  '我們不販售資料、不投放廣告，未經您同意不會將個人資料提供給學校或老師。',
  '您可隨時查詢、閱覽、取得副本、更正、停止使用或刪除個人資料；在「設定 → 帳號」即可下載資料或刪除帳號。',
  '若您不提供必要資料（如學校帳號），將無法使用本服務。',
];

/**
 * Describes what the app and server do today. When code changes what is
 * collected or which providers receive data, update this page in the same change.
 */
export function PrivacyPolicyContent() {
  return (
    <>
      <LegalSummary points={SUMMARY} />

      <LegalSection title="1. Who is responsible">
        <LegalParagraph>
          Ron&apos;s Mandarin is run by Ron, an individual developer based in Taiwan, who decides how your personal data
          is used and is responsible for it. The app is currently an invite-only beta for Shu-Te University
          students. Questions or requests: <ContactLink />.
        </LegalParagraph>
        <LegalParagraph>
          This policy is written to meet Taiwan&apos;s Personal Data Protection Act (個人資料保護法), including the notice
          required by its Article 8, and the Philippine Data Privacy Act of 2012 (Republic Act 10173) for users
          in the Philippines.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="2. What we collect">
        <LegalList
          items={[
            <>
              <strong>Account:</strong> your school email address, plus your name and profile picture from your
              Google account, kept only in your sign-in record. Your school email shows that you are a Shu-Te
              student; we do not collect your student records, grades or enrolment status.
            </>,
            <>
              <strong>Learning data:</strong> which cards you have learned, their review schedule and review
              history, and your synced settings (favorites, selected book and lessons, character style, profile
              picture choice).
            </>,
            <>
              <strong>Your content:</strong> the folders and custom flashcards you create.
            </>,
            <>
              <strong>Study together:</strong> while the app is open, other signed-in students can see your display
              name, avatar colour and which lesson and activity you are on. You can turn this off with Settings → Show
              me online. Lesson chat messages, quiz rooms you open and reports you make are visible to the other
              students in that lesson or room.
            </>,
            <>
              <strong>Messages:</strong> anything you send us by email, such as feedback or requests.
            </>,
            <>
              <strong>Technical data:</strong> like any website, our servers and hosting providers see your IP
              address and basic device and browser details. If error monitoring is on, Sentry receives technical
              error messages and stack traces with browser context. Our reports leave out request URLs, headers,
              request bodies and account identity, and do not intentionally include lesson content or progress.
            </>,
          ]}
        />
        <LegalParagraph>
          Some progress, such as grammar lesson completion, stays only on your device. We do not collect your
          location, contacts, microphone recordings, or payment details. The app has no advertising, no ad
          trackers and no third-party analytics.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="3. Why we use it">
        <LegalList
          items={[
            'to create and run your account and check that you are allowed into the beta;',
            'to save your progress and sync it between your devices;',
            'to schedule your reviews and show your levels and readiness;',
            'to prevent abuse and keep the service secure (for example, usage limits per account);',
            'to answer your messages and fix problems;',
            'to improve the lessons using anonymous, combined statistics only, such as which words most learners find hard. These statistics never identify you and are never used to build a profile of you.',
          ]}
        />
        <LegalParagraph>
          Under Taiwan law, these fall within the specific purposes of contract and similar relationships (069),
          customer management and service (090), information and communication services (135), information and
          database management (136), and survey, statistics and research analysis (157). We process your data
          because it is needed to provide the service you signed up for and, where needed, with your consent.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="4. Who we share it with">
        <LegalParagraph>
          We do not sell your data, show ads, or share it for marketing. We do not give your individual data to
          Shu-Te University, your teachers, or the textbook publisher unless you ask us to or the law requires it.
          These providers process data for us, only to run the app:
        </LegalParagraph>
        <LegalList
          items={[
            <>
              <strong>Supabase</strong> hosts your account and learning data in India (Mumbai, ap-south-1). Each
              account can read only its own rows.
            </>,
            <>
              <strong>Google</strong> handles sign-in.
            </>,
            <>
              <strong>Cloudflare R2</strong> stores audio files and lesson content. They contain no personal data.
            </>,
            <>
              <strong>Cloudflare Workers</strong> run study together: who is online (kept only while you are
              connected), lesson chat, quiz rooms and chat reports.
            </>,
            <>
              <strong>Our web host</strong> serves the app and may keep standard server logs.
            </>,
            <>
              <strong>Sentry</strong> processes technical error reports when it is turned on. No session replay or
              performance tracing.
            </>,
            <>
              <strong>Your browser&apos;s speech voices</strong> read text that has no recording. How that works
              depends on your browser and operating system.
            </>,
            <>
              <strong>Public CDNs</strong> (jsDelivr, unpkg, GitHub): for handwriting practice on characters outside
              the course, the app may fetch stroke data from these. They see your IP address and the character
              requested.
            </>,
          ]}
        />
        <LegalParagraph>
          We may also disclose data when the law, a court or a government authority requires it, or to protect
          the safety of users or the service.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="5. Where it goes">
        <LegalParagraph>
          Your data is stored in India and may be processed in other countries where our providers operate,
          including the United States. We use only providers that protect data with security measures suited to
          the risk.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="6. How long we keep it">
        <LegalList
          items={[
            'Account, learning data and your content: until you delete your account, or until your account has had no sign-in for 12 months, whichever comes first.',
            'Deleting your account removes your profile, progress, folders and cards from our database right away. Our database provider may keep routine backups for a limited time afterwards.',
            'Study together: who is online is kept only while you are connected. Lesson chat shows the last 50 messages per lesson for 24 hours; expired storage is cleaned hourly. Quiz rooms expire automatically and races have a ten-minute limit. We keep up to 1,000 recent chat reports for up to 30 days.',
            'Emails you send us: as long as needed to handle your request.',
            'Anonymous statistics contain no personal data and may be kept.',
            'Cached audio is stored by text, not by user, so it is not linked to you.',
          ]}
        />
      </LegalSection>

      <LegalSection title="7. Data on your device">
        <LegalParagraph>
          The app stores your sign-in session, a copy of your progress and settings (so it works offline), and
          cached lessons and audio in your browser (local storage, IndexedDB, Cache Storage and a service worker).
          We set no advertising or tracking cookies, so there is no cookie banner. Clearing your site data
          removes all of this from the device.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="8. How we protect it">
        <LegalParagraph>
          All traffic is encrypted (HTTPS). Database rules let each account read only its own data, secret keys
          stay on the server, and access to production systems is limited to the operator. No system is perfectly
          secure. If a breach affects your personal data, we will tell you after we find out, as Article 12 of
          Taiwan&apos;s Personal Data Protection Act and Philippine law require, and say what happened and what we are
          doing about it.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="9. Your rights">
        <LegalParagraph>Under Taiwan&apos;s Personal Data Protection Act (Article 3) you can:</LegalParagraph>
        <LegalList
          items={[
            'ask what data we hold about you and look at it;',
            'get a copy of it;',
            'add to it or correct it;',
            'ask us to stop collecting, processing or using it;',
            'ask us to delete it.',
          ]}
        />
        <LegalParagraph>
          If you are in the Philippines, you also have the rights in the Data Privacy Act of 2012, including to be
          informed, to object, to data portability, and to complain to the National Privacy Commission.
        </LegalParagraph>
        <LegalParagraph>
          In the app, open Settings, then Account, to <strong>download your data</strong> as a JSON file or{' '}
          <strong>delete your account</strong>. For anything else, email <ContactLink /> from your account&apos;s
          email address. It is free. We reply within 15 days for access and copies and within 30 days for
          corrections, stopping use or deletion; if we need more time we will tell you why. You can also complain
          to the data-protection authority where you live.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="10. If you do not provide data">
        <LegalParagraph>
          A school Google account is needed to sign in. Without it you cannot use the app during the beta. All
          other data is created by using the app.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="11. Age">
        <LegalParagraph>
          The app is for adults 18 and older. We do not knowingly collect data from anyone younger. If you believe
          someone under 18 has given us data, email us and we will delete it.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="12. Changes">
        <LegalParagraph>
          We will update the effective date above whenever this policy changes. For meaningful changes we will show
          a notice in the app at least 7 days before they take effect. The Chinese summary at the top is for
          convenience; the English text controls. See also our{' '}
          <Link to={LEGAL_ROUTES.terms} className={legalLinkClass}>Terms of Service</Link>.
        </LegalParagraph>
      </LegalSection>
    </>
  );
}
