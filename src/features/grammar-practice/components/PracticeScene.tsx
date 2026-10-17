import type { ReactNode } from 'react';
import type { PracticePlace, PracticeRoutePin, PracticeScene as Scene, PracticeText } from '../../../types/models';
import { ChangeScene } from './ChangeScene';
import { CountdownScene, Moment } from './CountdownScene';
import { MonthScene } from './MonthScene';
import { PictureScene } from './PictureScene';
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
  if (scene.type === 'change') return <ChangeScene before={scene.before} now={scene.now} />;
  if (scene.type === 'countdown') return <CountdownScene now={scene.now} next={scene.next} renderChinese={renderChinese} />;
  if (scene.type === 'moment') {
    return (
      <div className="flex justify-center rounded-feature border-2 border-ui-divider bg-ui-surface px-3 py-6">
        <Moment moment={scene.moment} next renderChinese={renderChinese} />
      </div>
    );
  }
  if (scene.type === 'month') return <MonthScene year={scene.year} month={scene.month} highlight={scene.highlight} renderChinese={renderChinese} />;
  if (scene.type === 'picture') return <PictureScene page={scene.page} box={scene.box} alt={scene.alt} />;
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
