import type { GrammarPractice, PracticeScene } from '../../types/models';
import { preloadImages } from '../../utils/browser/preloadAssets';
import { generatedPictureAssets, generatedSceneAssets, pictureArtKey, sceneArtKey } from './components/generatedPictureAssets';

const SCENE_TYPES = new Set<string>(['route', 'change', 'countdown', 'moment', 'month', 'picture', 'cast']);
/** The first screenful; later pictures load while the learner works. */
const FIRST_PICTURES = 8;

/** Illustration URLs the exercise shows, in item order (book scans load through their own content fetch). */
export function practicePictureUrls(practice: GrammarPractice): string[] {
  const urls: string[] = [];
  const visit = (value: unknown) => {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) { value.forEach(visit); return; }
    const record = value as Record<string, unknown>;
    if (typeof record.type === 'string' && SCENE_TYPES.has(record.type)) {
      const scene = record as unknown as PracticeScene;
      const art = scene.type === 'picture'
        ? generatedPictureAssets[pictureArtKey(scene)]
        : generatedSceneAssets[sceneArtKey(scene) ?? ''];
      if (art) urls.push(art.src);
    }
    Object.values(record).forEach(visit);
  };
  visit(practice.items);
  return [...new Set(urls)];
}

/** Resolves once the exercise's first pictures are decoded, so it opens complete. */
export function preparePracticePictures(practice: GrammarPractice): Promise<void> {
  return preloadImages(practicePictureUrls(practice).slice(0, FIRST_PICTURES));
}
