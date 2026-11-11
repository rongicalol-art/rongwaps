import { useEffect, useState, type ReactNode } from 'react';
import { fetchContentBlobUrl } from '../../../services/staticContentService';
import type { PracticeCastMember } from '../../../types/models';
import wangThinking from '../../../assets/images/grammar-practice/wang-thinking.webp';
import { bookPagePath } from '../../../utils/grammar/bookPagePath';
import { generatedPictureAssets, pictureArtKey } from './generatedPictureAssets';

interface PictureSceneProps {
  /** The book the page is from; Book 1 when left out. */
  book?: number;
  page: number;
  /** left, top, width, height as 0–1 fractions of the page. */
  box: [number, number, number, number];
  alt: string;
}

/** Loads one scan of the printed book page (gated, so it goes through the content fetch). */
export function usePageImage(page: number, book = 1) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    const controller = new AbortController();
    setSrc(null);
    setFailed(false);
    fetchContentBlobUrl(bookPagePath(book, page), controller.signal).then(
      (url) => { if (live) setSrc(url); },
      () => { if (live) setFailed(true); },
    );
    return () => { live = false; controller.abort(); };
  }, [book, page, attempt]);
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

/** Generated scenes share their presentation with the slot-build layout check. */
export function sceneFirstPicture(props: PictureSceneProps) {
  const art = generatedPictureAssets[pictureArtKey(props)];
  if (!art) return null;
  return <IllustratedPicture key={art.src} {...props} src={art.src} alt={art.alt ?? props.alt} caption={art.caption} />;
}

/** Reviewed illustrations are keyed by the exact source crop; everything else keeps the book's scan. */
export function PictureScene(props: PictureSceneProps) {
  const reviewed = sceneFirstPicture(props);
  if (reviewed) return reviewed;
  if (!props.book && props.page === 45 && props.box.join(',') === '0.68,0.762,0.167,0.136') {
    return <img src={wangThinking} alt={props.alt} draggable={false} className="mx-auto block h-auto max-h-[230px] w-full max-w-[285px] select-none object-contain sm:max-h-[300px]" />;
  }
  return <BookPictureScene {...props} />;
}

export function IllustratedPicture({ src, caption, ...props }: PictureSceneProps & { src: string; caption?: ReactNode }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <BookPictureScene {...props} />;
  return (
    <figure className="mx-auto w-full max-w-sm">
      <img src={src} alt={props.alt} onError={() => setFailed(true)} draggable={false} className="mx-auto block h-auto max-h-[196px] w-auto max-w-full select-none rounded-control sm:max-h-60" />
      {caption && <figcaption className="mt-2 text-center font-chinese font-semibold text-sm text-ui-ink">{caption}</figcaption>}
    </figure>
  );
}

/** A crop of the printed book page, shown as the picture an exercise is about. */
function BookPictureScene({ book, page, box, alt }: PictureSceneProps) {
  const { src, failed, retry, onError } = usePageImage(page, book);
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
      className="mx-auto w-full overflow-hidden rounded-control"
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

/** One person: the picture, then the name, its pinyin and the note exactly as the book prints them. */
function CastCaption({ person }: { person: PracticeCastMember }) {
  return (
    <figcaption className="mt-1 flex flex-col items-center leading-tight">
      <span className="font-chinese font-semibold text-sm text-ui-ink-strong sm:text-base">{person.name}</span>
      <span className="text-[10px] font-extrabold text-ui-muted-strong sm:text-xs">{person.pinyin}</span>
      <span className="mt-0.5 font-chinese font-semibold text-xs text-ui-ink">{person.note}</span>
    </figcaption>
  );
}

/** The people the book introduces side by side (a picture each, with name and nationality), so the learner reads across all of them. */
export function CastScene({ page, people, alt }: { page: number; people: PracticeCastMember[]; alt: string }) {
  return <BookCastScene page={page} people={people} alt={alt} />;
}

function BookCastScene({ page, people, alt }: { page: number; people: PracticeCastMember[]; alt: string }) {
  const { src, failed } = usePageImage(page);
  const [pageRatio, setPageRatio] = useState(0.75);

 // Pictures differ a little in height: share the tallest slot and sit on its floor so every caption lines up.
  const shape = (box: PracticeCastMember['box']) => (box[2] * pageRatio) / box[3];
  const tallest = Math.min(...people.map((person) => shape(person.box)));

  if (failed) return null;
  return (
    <div role="group" aria-label={alt} className="grid w-full max-w-md grid-cols-4 gap-1 sm:gap-3">
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
            <CastCaption person={person} />
          </figure>
        );
      })}
    </div>
  );
}
