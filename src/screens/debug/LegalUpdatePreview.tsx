import { LegalUpdateBanner } from '../legal';

const noop = () => {};

/** Fake Terms change; shows what signed-in users see before a change takes effect. */
export function LegalUpdatePreview() {
  return (
    <section className="space-y-3 rounded-feature border-2 border-ui-divider p-4">
      <h2 className="text-xl font-black text-ui-ink-strong">Terms change notice · safe preview</h2>
      <div className="max-w-sm">
        <LegalUpdateBanner
          inline
          update={{ page: 'terms', summary: 'Tips can now be sent through Ko-fi.' }}
          effectiveDate="2026-11-01"
          onRead={noop}
          onDismiss={noop}
        />
      </div>
    </section>
  );
}
