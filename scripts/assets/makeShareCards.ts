/**
 * Link-preview pictures for challenge links (public/share/b1l05.jpg, 1200×630): each lesson's first reading
 * illustration, centred and cropped to the wide card LINE and other chat apps show. Run after a lesson's
 * first reading picture changes:  npx tsx scripts/assets/makeShareCards.ts
 * The preview pages that name them come from scripts/build/prerenderEntry.tsx.
 */
import { mkdir, readFile } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'public/share');
const SOURCE = path.join(ROOT, 'src/data/readingIllustrations.ts');

async function main() {
  const source = await readFile(SOURCE, 'utf8');
  // 'B1L05-R01': { url: new URL('../assets/images/readings/b1l05-r01-….webp', import.meta.url).href,
  const entries = [...source.matchAll(/'B(\d)L(\d{2})-R01':\s*\{\s*url:\s*new URL\('\.\.\/(assets\/images\/readings\/[^']+\.webp)'/g)];
  if (entries.length === 0) throw new Error('No first-reading pictures found in src/data/readingIllustrations.ts');
  await mkdir(OUT, { recursive: true });
  for (const [, book, lesson, file] of entries) {
    const name = `b${book}l${lesson}.jpg`;
    await sharp(path.join(ROOT, 'src', file))
      .resize(1200, 630, { fit: 'cover', position: 'centre' })
      .jpeg({ quality: 72, mozjpeg: true })
      .toFile(path.join(OUT, name));
    console.log(`share card: ${name}`);
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
