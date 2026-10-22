import { useEffect, useState } from 'react';
import { fetchContentBlobUrl } from '../../../services/staticContentService';
import type { PracticeCastMember } from '../../../types/models';
import wangThinking from '../../../assets/images/grammar-practice/wang-thinking.webp';
import restlessSleep from '../../../assets/images/grammar-practice/restless-sleep.webp';
import { bookPagePath } from '../../../utils/grammar/bookPagePath';
import { CountdownScene } from './CountdownScene';
import { ChangeScene } from './ChangeScene';
import { objectScene } from './ObjectScenes';
import { RouteScene } from './RouteScene';

interface PictureSceneProps {
  page: number;
  /** left, top, width, height as 0–1 fractions of the page. */
  box: [number, number, number, number];
  alt: string;
}

/** Loads one scan of the printed book 1 page (gated, so it goes through the content fetch). */
export function usePageImage(page: number) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    const controller = new AbortController();
    setSrc(null);
    setFailed(false);
    fetchContentBlobUrl(bookPagePath(1, page), controller.signal).then(
      (url) => { if (live) setSrc(url); },
      () => { if (live) setFailed(true); },
    );
    return () => { live = false; controller.abort(); };
  }, [page, attempt]);
  return { src, failed, retry: () => setAttempt((value) => value + 1), onError: () => setFailed(true) };
}

/** The `box` part of a scan, filling its parent (which sets the crop's aspect ratio). */
export function PageCrop({ src, box, alt, onLoad, onError }: {
  src: string;
  box: [number, number, number, number];
  alt: string;
  onLoad?: (event: React.SyntheticEvent<HTMLImageElement>) => void;
  onError?: () => void;
}) {
  const [left, top, width, height] = box;
  return (
    <img
      src={src}
      alt={alt}
      draggable={false}
      onLoad={onLoad}
      onError={onError}
      className="absolute max-w-none select-none"
      style={{
        width: `${100 / width}%`,
        left: `${-(left / width) * 100}%`,
        top: `${-(top / height) * 100}%`,
      }}
    />
  );
}

/** One owner for the source-checked pilots and their scene-first presentation. */
export function sceneFirstPicture(props: PictureSceneProps) {
  const key = `${props.page}:${props.box.join(',')}`;
  if (key === '99:0.207,0.34,0.08,0.11') {
    // The adult shirt draft is not source-faithful. Keep the book's boy until a redraw is approved.
    return <BookPictureScene {...props} />;
  }
  if (key === '125:0.178,0.262,0.125,0.073') {
    return (
      <svg role="img" aria-label={props.alt} viewBox="0 0 340 250" className="mx-auto h-[196px] max-w-full sm:h-60">
        <ellipse cx="170" cy="234" rx="128" ry="8" className="fill-ui-divider" />
        <rect x="80" y="130" width="17" height="102" rx="6" className="fill-brand-secondary-edge" />
        <rect x="243" y="130" width="17" height="102" rx="6" className="fill-brand-secondary-edge" />
        <rect x="56" y="122" width="228" height="20" rx="8" className="fill-brand-secondary-edge" />
        <rect x="56" y="112" width="228" height="20" rx="8" className="fill-brand-secondary" />
        <path d="M70 118h70" className="fill-none stroke-brand-on-primary opacity-30 [stroke-linecap:round] [stroke-width:4]" />
        <rect x="110" y="96" width="122" height="16" rx="5" className="fill-brand-primary-edge" />
        <rect x="118" y="84" width="112" height="16" rx="3" className="fill-ui-surface" />
        <path d="M126 89h96M126 95h96" className="fill-none stroke-ui-divider [stroke-width:2]" />
        <rect x="110" y="72" width="122" height="15" rx="5" className="fill-brand-primary" />
        <path d="M206 72v26l7 -5 7 5V72z" className="fill-brand-secondary" />
      </svg>
    );
  }
  if (key === '138:0.647,0.281,0.205,0.145') return <IllustratedPicture {...props} src={restlessSleep} />;
  if (key === '166:0.252,0.258,0.211,0.119') {
    return <ChangeScene before={{ date: { month: 3, day: 28 }, label: '昨天 · 星期三', value: '25°C' }} now={{ date: { month: 3, day: 29 }, label: '今天 · 星期四', value: '30°C' }} />;
  }
  if (key === '166:0.615,0.243,0.219,0.145') {
    return (
      <ChangeScene alt={props.alt} before={{ label: '2016年', value: '$80' }} now={{ label: '現在', value: '$120' }}>
        <svg viewBox="0 0 250 140" className="h-28 w-56" aria-hidden="true">
          <path d="M70 46L160 6M84 48L178 14" className="fill-none stroke-brand-primary-deep [stroke-linecap:round] [stroke-width:7]" />
          <rect x="92" y="112" width="66" height="18" rx="7" className="fill-brand-secondary-edge" />
          <path d="M24 58Q36 124 125 124Q214 124 226 58Z" className="fill-brand-secondary-edge" />
          <path d="M24 52Q36 118 125 118Q214 118 226 52Z" className="fill-brand-secondary" />
          <path d="M44 74Q58 104 98 110" className="fill-none stroke-brand-on-primary opacity-30 [stroke-linecap:round] [stroke-width:7]" />
          <ellipse cx="125" cy="52" rx="103" ry="20" className="fill-brand-secondary-edge" />
          <ellipse cx="125" cy="50" rx="92" ry="14" className="fill-brand-secondary-soft" />
          <path d="M62 50q14 -10 28 0t28 0 28 0 28 0M70 56q14 -8 28 0t28 0 28 0" className="fill-none stroke-brand-secondary [stroke-linecap:round] [stroke-width:3.5]" />
          <rect x="132" y="38" width="30" height="13" rx="6" transform="rotate(-8 147 44)" className="fill-brand-secondary-edge" />
          <rect x="94" y="40" width="26" height="12" rx="6" transform="rotate(10 107 46)" className="fill-brand-secondary-edge" />
        </svg>
      </ChangeScene>
    );
  }
  if (key === '195:0.193,0.676,0.293,0.136') {
    return <CountdownScene now={{ date: { month: 4, day: 3 }, label: { traditional: '今天', pinyin: 'jīntiān', english: 'today' } }} next={{ date: { month: 4, day: 5 } }} renderChinese={(text) => text.traditional} />;
  }
  if (key === '196:0.202,0.148,0.287,0.121') {
    return <CountdownScene now={{ time: '11:50', label: { traditional: '現在', pinyin: 'xiànzài', english: 'now' } }} next={{ time: '12:00', label: { traditional: '中午休息時間', pinyin: 'zhōngwǔ xiūxí shíjiān', english: 'noon break' } }} renderChinese={(text) => text.traditional} />;
  }
  if (key === '196:0.2,0.344,0.275,0.123') {
    return <CountdownScene now={{ date: { month: 10, day: 1 }, label: { traditional: '今天', pinyin: 'jīntiān', english: 'today' } }} next={{ date: { month: 10, day: 10 }, label: { traditional: '弟弟十歲生日', pinyin: 'dìdi shí suì shēngrì', english: 'younger brother’s tenth birthday' } }} renderChinese={(text) => text.traditional} />;
  }
  return null;
}

/** Reviewed replacements are keyed by the exact source crop; everything else keeps the scan. */
export function PictureScene(props: PictureSceneProps) {
  // Redrawn object pictures replace the scan but keep the item's own layout and instruction.
  const drawn = objectScene(`${props.page}:${props.box.join(',')}`, props.alt);
  if (drawn) return drawn;
  const reviewed = sceneFirstPicture(props);
  if (reviewed) return reviewed;
  if (props.page === 45 && props.box.join(',') === '0.68,0.762,0.167,0.136') {
    return <img src={wangThinking} alt={props.alt} draggable={false} className="mx-auto block h-auto max-h-[230px] w-full max-w-[285px] select-none object-contain sm:max-h-[300px]" />;
  }
  // Source-checked diagram replacements; coordinates identify the printed exercise, not a guessed alt-text match.
  const key = `${props.page}:${props.box.join(',')}`;
  if (key === '163:0.173,0.332,0.296,0.1') {
    return <RouteScene from={{ icon: 'usa', label: '美國' }} to={{ icon: 'taiwan', label: '台灣' }} arrived={false} showPurpose={false} />;
  }
  if (key === '163:0.18,0.502,0.28,0.095') {
    return <RouteScene from={{ icon: 'home', label: '家' }} to={{ icon: 'school', label: '學校' }} arrived={false} showPurpose={false} />;
  }
  if (key === '163:0.176,0.677,0.23,0.084') {
    return <RouteScene from={{ icon: 'restaurant', label: '餐廳' }} to={{ icon: 'library', label: '圖書館' }} arrived={false} showPurpose={false} />;
  }
  return <BookPictureScene {...props} />;
}

function IllustratedPicture({ src, ...props }: PictureSceneProps & { src: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <BookPictureScene {...props} />;
  return <img src={src} alt={props.alt} onError={() => setFailed(true)} draggable={false} className="mx-auto block h-auto max-h-[196px] w-full max-w-sm select-none object-contain sm:max-h-60" />;
}

/** A crop of the printed book 1 page, shown as the picture an exercise is about. */
function BookPictureScene({ page, box, alt }: PictureSceneProps) {
  const { src, failed, retry, onError } = usePageImage(page);
  /** Page width / height; a typical page until the scan loads. */
  const [pageRatio, setPageRatio] = useState(0.75);
  const [, , width, height] = box;

  if (failed) return (
    <div role="status" className="mx-auto max-w-sm text-center text-sm text-ui-ink">
      <p>{alt}</p>
      <button type="button" onClick={retry} className="mt-3 rounded-xs font-extrabold text-brand-primary-deep underline focus-ring-inline">Retry picture</button>
    </div>
  );
  return (
    <div
      className="mx-auto w-full overflow-hidden rounded-feature border-2 border-ui-divider bg-ui-surface"
      // Height capped so the dialogue below stays in view; width follows the crop's shape (plus the 4px border).
      style={{ maxWidth: `calc(min(28rem, calc(min(30vh, 220px) * ${(width * pageRatio) / height})) + 4px)` }}
    >
      {/* The ratio lives inside the border, or the crop drifts off its box (tall crops most). */}
      <div className="relative w-full" style={{ aspectRatio: `${width * pageRatio} / ${height}` }}>
        {src ? (
          <PageCrop src={src} box={box} alt={alt} onError={onError} onLoad={(event) => setPageRatio(event.currentTarget.naturalWidth / event.currentTarget.naturalHeight)} />
        ) : (
          <div role="status" aria-label="Loading picture" className="absolute inset-0 animate-pulse bg-ui-hover" />
        )}
      </div>
    </div>
  );
}

/** The people the book introduces side by side (a picture each, with name and nationality), so the learner reads across all of them. */
export function CastScene({ page, people, alt }: { page: number; people: PracticeCastMember[]; alt: string }) {
  const { src, failed } = usePageImage(page);
  const [pageRatio, setPageRatio] = useState(0.75);

 // Pictures differ a little in height: share the tallest slot and sit on its floor so every caption lines up.
  const shape = (box: PracticeCastMember['box']) => (box[2] * pageRatio) / box[3];
  const tallest = Math.min(...people.map((person) => shape(person.box)));

  if (failed) return null;
  return (
    <div role="group" aria-label={alt} className="mx-auto grid w-full max-w-md grid-cols-4 gap-1 rounded-feature border-2 border-ui-divider bg-ui-surface px-1.5 py-2 sm:gap-3 sm:px-3">
      {people.map((person, index) => {
        return (
          <figure key={person.name} className="flex min-w-0 flex-col items-center text-center">
            <div className="relative w-full" style={{ aspectRatio: String(tallest) }}>
              <div className="absolute inset-x-0 bottom-0 overflow-hidden" style={{ aspectRatio: String(shape(person.box)) }}>
                {src ? (
                  <PageCrop src={src} box={person.box} alt="" onLoad={index === 0 ? (event) => setPageRatio(event.currentTarget.naturalWidth / event.currentTarget.naturalHeight) : undefined} />
                ) : (
                  <div className="absolute inset-0 animate-pulse bg-ui-hover" />
                )}
              </div>
            </div>
            <figcaption className="mt-1 flex flex-col items-center leading-tight">
              <span className="font-chinese text-sm font-black text-ui-ink-strong sm:text-base">{person.name}</span>
              <span className="text-[10px] font-extrabold text-ui-muted-strong sm:text-xs">{person.pinyin}</span>
              <span className="mt-0.5 font-chinese text-xs font-bold text-ui-ink">{person.note}</span>
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}
