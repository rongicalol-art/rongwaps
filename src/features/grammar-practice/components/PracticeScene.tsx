import type { ReactNode } from 'react';
import type { PracticePlace, PracticeRoutePin, PracticeScene as Scene, PracticeText } from '../../../types/models';
import { ChangeScene } from './ChangeScene';
import { CountdownScene, Moment } from './CountdownScene';
import { MonthScene } from './MonthScene';
import { CastScene, IllustratedPicture, PictureScene } from './PictureScene';
import { generatedSceneAssets, sceneArtKey } from './generatedPictureAssets';
import { RouteScene } from './RouteScene';

interface PracticeSceneProps {
  scene: Scene;
  arrived: boolean;
  /** Chinese captions with their dictionary action. */
  renderChinese: (text: PracticeText) => ReactNode;
  /** For reel exercises: the place a reel currently shows (null until chosen). */
  reelPlace?: (reelId: string) => PracticePlace | null;
}

/** The picture an exercise is about. Pins may follow a reel's choice. */
export function PracticeScene({ scene, arrived, renderChinese, reelPlace }: PracticeSceneProps) {
  // A clock or calendar is an illustration when one has been made for exactly what it shows.
  const art = generatedSceneAssets[sceneArtKey(scene) ?? ''];
  if (art) {
    const label = scene.type === 'moment' ? scene.moment.label : undefined;
    // The people row names everyone left to right; the picture itself shows where each is from.
    const names = scene.type === 'cast' ? (
      <span className="grid grid-cols-4 gap-1 leading-tight">
        {scene.people.map((person) => (
          <span key={person.name} className="flex flex-col items-center">
            <span className="font-chinese font-semibold text-sm text-ui-ink-strong sm:text-base">{person.name}</span>
            <span className="font-sans text-[10px] font-extrabold text-ui-muted-strong sm:text-xs">{person.pinyin}</span>
          </span>
        ))}
      </span>
    ) : undefined;
    return <IllustratedPicture page={0} box={[0, 0, 1, 1]} src={art.src} alt={art.alt} caption={names ?? (label ? renderChinese(label) : undefined)} />;
  }
  if (scene.type === 'change') return <ChangeScene before={scene.before} now={scene.now} />;
  if (scene.type === 'countdown') return <CountdownScene now={scene.now} next={scene.next} renderChinese={renderChinese} />;
  if (scene.type === 'moment') {
    return (
      <div className="flex justify-center">
        <Moment moment={scene.moment} next renderChinese={renderChinese} />
      </div>
    );
  }
  if (scene.type === 'month') return <MonthScene year={scene.year} month={scene.month} highlight={scene.highlight} renderChinese={renderChinese} />;
  if (scene.type === 'cast') return <CastScene page={scene.page} people={scene.people} alt={scene.alt} />;
  if (scene.type === 'picture') return <PictureScene book={scene.book} page={scene.page} box={scene.box} alt={scene.alt} />;
  const resolve = (pin?: PracticeRoutePin) => (!pin ? null : 'reel' in pin ? reelPlace?.(pin.reel) ?? null : pin);
  return (
    <RouteScene
      from={resolve(scene.from)}
      to={resolve(scene.to)}
      purpose={resolve(scene.purpose)}
      showPurpose={Boolean(scene.purpose)}
      arrived={arrived}
    />
  );
}
