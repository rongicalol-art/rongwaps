import type { ReactNode } from 'react';
import { LEGAL_CONTACT_EMAIL } from './legalMeta';

/** Typography primitives shared by the Privacy Policy and Terms of Service. */

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-extrabold tracking-tight text-ui-ink-strong sm:text-xl">{title}</h2>
      {children}
    </section>
  );
}

export function LegalParagraph({ children }: { children: ReactNode }) {
  return <p className="text-base font-semibold leading-relaxed text-ui-ink">{children}</p>;
}

export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="flex list-disc flex-col gap-2 pl-5 text-base font-semibold leading-relaxed text-ui-ink marker:text-ui-muted">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

/** Traditional Chinese summary at the top of a legal page; the English text below controls. */
export function LegalSummary({ points }: { points: string[] }) {
  return (
    <section lang="zh-Hant" aria-label="中文摘要" className="flex flex-col gap-2 rounded-lg bg-ui-surface px-4 py-4 sm:px-5">
      <h2 className="text-base font-extrabold text-ui-ink-strong">中文摘要</h2>
      <ul className="flex list-disc flex-col gap-1.5 pl-5 text-base font-semibold leading-relaxed text-ui-ink marker:text-ui-muted">
        {points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
      <p className="text-sm font-bold text-ui-muted-strong">本摘要僅供參考；如與英文內容不一致，以英文為準。</p>
    </section>
  );
}

export const legalLinkClass = 'rounded-xs font-extrabold text-brand-primary hover:underline focus-ring-inline';

export function ContactLink() {
  return (
    <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className={legalLinkClass}>
      {LEGAL_CONTACT_EMAIL}
    </a>
  );
}
