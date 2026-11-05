import { Link } from 'react-router';
import { LEGAL_ROUTES } from '../../app/routes';
import { ContactLink, LegalList, LegalParagraph, LegalSection, LegalSummary, legalLinkClass } from './LegalBlocks';

const SUMMARY = [
  '個人資料蒐集者：個人開發者 Ron（台灣）。依《個人資料保護法》第 8 條告知如下。',
  '蒐集項目：Google 電子郵件、帳號名稱與頭像、年齡確認紀錄、學習紀錄、您設定的個人檔案（名稱、顏色、上傳的照片與封面）、您建立的資料夾與字卡、封鎖名單與檢舉紀錄，以及基本技術資料。',
  '「一起學習」中，其他已登入的學習者（包括樹德以外的人）會看到您的顯示名稱、照片或姓名縮寫，以及您正在學的課；可在 Settings → Show me online 關閉（每台裝置分別設定）。',
  '目的：提供與同步學習服務、帳號管理、防止濫用、改善教材（僅使用匿名統計）。',
  '期間與地區：保存至您刪除帳號，或連續 12 個月未登入為止；加密備份最多保留 90 天；7 天內未完成年齡確認的新帳號會被刪除；因違規停權的帳號，其 Google 帳號的單向代碼保存 2 年。資料存放於印度（Supabase），並由下列服務商處理。',
  '我們不販售資料、不投放廣告，未經您同意不會將個人資料提供給學校或老師。',
  '您可隨時查詢、閱覽、取得副本、更正、停止使用或刪除個人資料；在「設定 → 帳號」即可下載資料或刪除帳號。',
  '若您不提供必要資料（如 Google 帳號），將無法使用本服務。',
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
          is used and is responsible for it. The app is a free beta, open to anyone 18 or older with a Google
          account. Questions or requests: <ContactLink />.
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
              <strong>Account:</strong> your Google email address, name and profile picture, which Google sends when
              you sign in, and the date you confirmed you are 18 or older. If you sign in with a Shu-Te school
              account, it shows you are a Shu-Te student; we do not collect student records, grades or enrolment
              status.
            </>,
            <>
              <strong>Profile:</strong> the display name, colour, photo and cover you choose. Photos and covers you
              upload are stored by our database provider. Without a display name, the first word of your Google name
              is used. Accounts created from November 6, 2026 show initials instead of the Google photo until you
              choose <em>Use Google photo</em> in Profile; older accounts keep showing it until you choose{' '}
              <em>Use initials</em>.
            </>,
            <>
              <strong>Learning data:</strong> which cards you have learned, their review schedule and review
              history, and your synced settings (favorites, selected book and lessons, character style, profile
              picture choice).
            </>,
            <>
              <strong>Your content:</strong> the folders and custom flashcards you create. If you share a
              folder&apos;s invite link, anyone with an account who has the link can join the folder and see its cards and
              its members&apos; display names and colours; you choose whether members can edit, and you can remove them.
            </>,
            <>
              <strong>Study together:</strong> while the app is open, other signed-in learners, including people
              outside Shu-Te, can see your display name, your photo (or your initials and colour) and which lesson
              and activity you are on. You can hide yourself with Settings → Show me online. A learner who opens your
              profile also sees your cover, book, the month you started and your words known, characters known and
              day streak, sent straight from your device and not stored; turn this off with Settings → Show my
              profile. Both choices are saved on each device, so set them on every device you use. Chat messages are
              visible to everyone in that chat (Everyone, a lesson, or a quiz room). A quiz room you open is listed,
              with your name and photo, to everyone online until it starts. If you block someone, we keep your block
              list so the two of you stay hidden from each other. If you report someone, we keep the report: the
              reason, where it happened, the message or photo you reported, the reported learner&apos;s display name, and
              who sent the report. The person you report is not told.
            </>,
            <>
              <strong>Account safety:</strong> if we close an account for breaking our{' '}
              <Link to={LEGAL_ROUTES.terms} className={legalLinkClass}>Terms</Link>, we keep a one-way code made from
              its Google account ID (not the email or name, and it cannot be turned back into them) so the same Google
              account cannot join again, even after the account is deleted.
            </>,
            <>
              <strong>Messages:</strong> feedback you send in the app or by email. In-app feedback includes
              your account ID, the current screen path, app version and browser details so we can investigate.
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
          Lesson test scores and some display choices (such as Show me online) stay only on your device. We do not collect your
          location, contacts, microphone recordings, or payment details. The app has no advertising, no ad
          trackers and no third-party analytics.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="3. Why we use it">
        <LegalList
          items={[
            'to create and run your account and check that you can join (age and sign-up limits);',
            'to save your progress and sync it between your devices;',
            'to schedule your reviews and show your levels and readiness;',
            'to prevent abuse and keep the service secure (for example, usage limits per account);',
            'to keep Study together safe: blocks, reports, daily limits and, when needed, closing an account;',
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
              <strong>Supabase</strong> hosts your account, learning data and uploaded photos in India (Mumbai,
              ap-south-1). Each account can read only its own data, apart from what you choose to share (folders and
              Study together).
            </>,
            <>
              <strong>Google</strong> handles sign-in.
            </>,
            <>
              <strong>Resend</strong>, when configured, delivers notifications to the operator by email: feedback
              (your message, account ID and screen path) and urgent safety reports (the report described above).
            </>,
            <>
              <strong>Cloudflare R2</strong> stores audio files and lesson content, which contain no personal data,
              and our encrypted database backups (see section 6).
            </>,
            <>
              <strong>Cloudflare Workers</strong> run Study together: who is online (kept only while you are
              connected), chat, quiz rooms, chat reports and your block list.
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
              <strong>Public CDNs</strong> (jsDelivr, with unpkg and GitHub as backups) serve the stroke data for
              stroke-order animations and handwriting practice. They see your IP address and which character was
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
            'Deleting your account removes your profile, photos, progress, folders and cards from our database right away. Our encrypted backups are kept for up to 90 days and are used only to recover from a fault, so deleted data can stay in them until then.',
            'A new account that does not answer the age question within 7 days is deleted.',
            'If we close an account for breaking the Terms, the one-way code described in section 2 is kept for 2 years.',
            'Study together: who is online is kept only while you are connected. Lesson chat shows the last 50 messages per lesson for 24 hours; expired storage is cleaned hourly. Quiz rooms expire automatically and races have a ten-minute limit. We keep up to 1,000 recent chat reports for up to 30 days.',
            'Reports you send, or that name you, are kept for 12 months and then deleted. Your block list is kept until you unblock or delete your account.',
            'In-app feedback is removed when you delete your account. Emails and feedback notifications are kept only as long as needed to handle your request.',
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
          stay on the server, and access to production systems is limited to the operator and, if appointed, one
          helper bound to confidentiality. No system is perfectly
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
          A Google account with a verified email is needed to sign in. Without it you cannot use the app. All
          other data is created by using the app.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="11. Age">
        <LegalParagraph>
          The app is for adults 18 and older. New accounts confirm this on first sign-in; if you say you are under
          18, the new account is deleted right away, and a new account that does not answer within 7 days is
          deleted too. We do not knowingly collect data from anyone younger. If you believe
          someone under 18 has given us data, email us and we will delete it.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="12. Changes">
        <LegalParagraph>
          We will update the effective date above whenever this policy changes. For meaningful changes we will show
          a notice in the app at least 7 days before they take effect. This version applies from sign-up to accounts
          created from November 6, 2026, and from the effective date above to accounts created earlier; until then the
          previous version applies to those accounts. The Chinese summary at the top is for
          convenience; the English text controls. See also our{' '}
          <Link to={LEGAL_ROUTES.terms} className={legalLinkClass}>Terms of Service</Link>.
        </LegalParagraph>
      </LegalSection>
    </>
  );
}
