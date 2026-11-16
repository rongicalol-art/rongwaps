import { DocList, DocParagraph, DocSection, docLinkClass } from '../public-doc';
import { LEGAL_CONTACT_EMAIL } from './legalMeta';

export { DocSection as LegalSection, DocParagraph as LegalParagraph, DocList as LegalList, docLinkClass as legalLinkClass };

/** Traditional Chinese summary at the top of a legal page; the English text below controls. */
export function LegalSummary({ points }: { points: string[] }) {
  return (
    <section lang="zh-Hant" aria-label="中文摘要" className="flex scroll-mt-24 flex-col gap-2 rounded-lg bg-ui-surface px-4 py-4 sm:px-5">
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

export function ContactLink() {
  return (
    <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className={docLinkClass}>
      {LEGAL_CONTACT_EMAIL}
    </a>
  );
}
