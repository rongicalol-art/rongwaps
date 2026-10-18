import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Licensing files that ship inside a publishable decomposition runtime pack.
 *
 * The pack is derived from CHISE/CJKVI IDS (GPL-2.0-or-later), Make Me a
 * Hanzi dictionary data (LGPL-3.0-or-later) and CNS11643 open data (Taiwan
 * OGDL 1.0). A combined derivative can be distributed under GPL-3.0-or-later,
 * which satisfies the "or later" options of both copyleft sources, provided
 * the notices and full license texts travel with the data. That is what this
 * module produces.
 */

export interface LicensingSourceRow {
  id: string;
  version: string;
  checksum: string;
  attribution: string | null;
}

interface SourceLicenseStatement {
  license: string;
  notices: string[];
}

const LICENSES_DIR = resolve(import.meta.dirname, 'licenses');

const SOURCE_STATEMENTS: Record<string, SourceLicenseStatement> = {
  'cjkvi-ids': {
    license: 'GPL-2.0-or-later',
    notices: [
      'The IDS structure data is derived from the CHISE project (ids.txt), which distributes the CHISE-IDS package under the GNU General Public License, version 2 or any later version.',
      'Some IDS-UCS data are derived and expanded from the CDP database developed by C.C. Hsieh and his team at Academia Sinica, Taipei, Taiwan.',
      'Sources: https://github.com/cjkvi/cjkvi-ids and https://gitlab.chise.org/CHISE/ids',
    ],
  },
  'makemeahanzi-dictionary': {
    license: 'LGPL-3.0-or-later',
    notices: [
      'The dictionary decomposition data is derived from Make Me a Hanzi dictionary.txt, which is derived from Unihan and CJKlib and distributed under the GNU Lesser General Public License, version 3 or any later version.',
      'Unihan data copyright (c) Unicode, Inc.; used under the Unicode Terms of Use (https://www.unicode.org/copyright.html).',
      'Source: https://github.com/skishore/makemeahanzi',
    ],
  },
  'cns11643-open-data': {
    license: 'Taiwan Open Government Data License 1.0',
    notices: [
      'Stroke and metadata come from the CNS11643 open data released by the Ministry of Digital Affairs, Taiwan, under the Open Government Data License, version 1.0 (https://data.gov.tw/license).',
    ],
  },
};

function statementFor(source: LicensingSourceRow): SourceLicenseStatement {
  return SOURCE_STATEMENTS[source.id] ?? { license: 'see attribution', notices: [] };
}

/** Accurate SPDX license for a source in a publishable pack, falling back to the recorded value. */
export function packSourceLicense(sourceId: string, fallback: string | null): string | null {
  return SOURCE_STATEMENTS[sourceId]?.license ?? fallback;
}

function readLicenseText(file: string): Buffer {
  return readFileSync(resolve(LICENSES_DIR, file));
}

export function buildLicensingFiles(sources: LicensingSourceRow[]): Array<{ path: string; bytes: Buffer }> {
  const sorted = [...sources].sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0));
  const lines: string[] = [
    'RongWaps decomposition runtime pack',
    '',
    'This machine-generated pack contains normalized character decomposition trees',
    '(structure, component indexes, and reverse indexes) derived from the sources',
    'listed below. Transformations from the upstream data are limited to parsing,',
    'normalization, selection for the learner course, and compact encoding. The',
    'derivation tooling is available on request at rongicalol@gmail.com.',
    '',
    'The pack as a whole is distributed under the GNU General Public License,',
    'version 3 or any later version (GPL-3.0-or-later). Full license texts are',
    'included in this directory:',
    '',
    '  licenses/GPL-3.0-or-later.txt',
    '  licenses/LGPL-3.0-or-later.txt',
    '',
    'Sources',
    '-------',
  ];
  for (const source of sorted) {
    const statement = statementFor(source);
    lines.push(`* ${source.id} (version ${source.version}, sha256 ${source.checksum})`);
    lines.push(`  License: ${statement.license}`);
    if (source.attribution) lines.push(`  Attribution: ${source.attribution}`);
    for (const notice of statement.notices) lines.push(`  ${notice}`);
    lines.push('');
  }
  lines.push('The derived pack does not include source-record identifiers, source text, or');
  lines.push('the upstream files themselves; those remain available from the sources above.');
  lines.push('');

  return [
    { path: 'NOTICE.txt', bytes: Buffer.from(lines.join('\n'), 'utf8') },
    { path: 'licenses/GPL-3.0-or-later.txt', bytes: readLicenseText('GPL-3.0-or-later.txt') },
    { path: 'licenses/LGPL-3.0-or-later.txt', bytes: readLicenseText('LGPL-3.0-or-later.txt') },
  ];
}
