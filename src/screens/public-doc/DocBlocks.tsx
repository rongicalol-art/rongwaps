import type { ReactNode } from 'react';

export function DocSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex scroll-mt-24 flex-col gap-3">
      <h2 className="text-lg font-extrabold tracking-tight text-ui-ink-strong sm:text-xl">{title}</h2>
      {children}
    </section>
  );
}

export function DocParagraph({ children }: { children: ReactNode }) {
  return <p className="text-base font-semibold leading-relaxed text-ui-ink">{children}</p>;
}

export function DocList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="flex list-disc flex-col gap-2 pl-5 text-base font-semibold leading-relaxed text-ui-ink marker:text-ui-muted">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

export const docLinkClass = 'rounded-xs font-extrabold text-brand-primary-text hover:underline focus-ring-inline';
