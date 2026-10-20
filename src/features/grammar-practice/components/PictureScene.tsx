import { useEffect, useState } from 'react';
import { fetchContentBlobUrl } from '../../../services/staticContentService';
import type { PracticeCastMember } from '../../../types/models';
import wangThinking from '../../../assets/images/grammar-practice/wang-thinking.webp';
import { bookPagePath } from '../../../utils/grammar/bookPagePath';
import { CountdownScene } from './CountdownScene';
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
  useEffect(() => {
    let live = true;
    setSrc(null);
    setFailed(false);
    fetchContentBlobUrl(bookPagePath(1, page)).then(
      (url) => { if (live) setSrc(url); },
      () => { if (live) setFailed(true); },
    );
    return () => { live = false; };
  }, [page]);
  return { src, failed };
}

/** The `box` part of a scan, filling its parent (which sets the crop's aspect ratio). */
export function PageCrop({ src, box, alt, onLoad }: {
  src: string;
  box: [number, number, number, number];
  alt: string;
  onLoad?: (event: React.SyntheticEvent<HTMLImageElement>) => void;
}) {
  const [left, top, width, height] = box;
  return (
    <img
      src={src}
      alt={alt}
      draggable={false}
      onLoad={onLoad}
      className="absolute max-w-none select-none"
      style={{
        width: `${100 / width}%`,
        left: `${-(left / width) * 100}%`,
        top: `${-(top / height) * 100}%`,
      }}
    />
  );
}

/** Reviewed replacement for p.45 #3; other scenes retain their printed-book source. */
export function PictureScene(props: PictureSceneProps) {
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
  if (key === '196:0.202,0.148,0.287,0.121') {
    return <CountdownScene now={{ time: '11:50', label: { traditional: '現在', pinyin: 'xiànzài', english: 'now' } }} next={{ time: '12:00', label: { traditional: '中午休息時間', pinyin: 'zhōngwǔ xiūxí shíjiān', english: 'noon break' } }} renderChinese={(text) => text.traditional} />;
  }
  return <BookPictureScene {...props} />;
}

/** A crop of the printed book 1 page, shown as the picture an exercise is about. */
function BookPictureScene({ page, box, alt }: PictureSceneProps) {
  const { src, failed } = usePageImage(page);
  /** Page width / height; a typical page until the scan loads. */
  const [pageRatio, setPageRatio] = useState(0.75);
  const [, , width, height] = box;

  if (failed) return null;
  return (
    <div
      className="mx-auto w-full overflow-hidden rounded-feature border-2 border-ui-divider bg-ui-surface"
      // Height capped so the dialogue below stays in view; width follows the crop's shape (plus the 4px border).
      style={{ maxWidth: `calc(min(28rem, calc(min(30vh, 220px) * ${(width * pageRatio) / height})) + 4px)` }}
    >
      {/* The ratio lives inside the border, or the crop drifts off its box (tall crops most). */}
      <div className="relative w-full" style={{ aspectRatio: `${width * pageRatio} / ${height}` }}>
        {src ? (
          <PageCrop src={src} box={box} alt={alt} onLoad={(event) => setPageRatio(event.currentTarget.naturalWidth / event.currentTarget.naturalHeight)} />
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
