import { useEffect, useState } from 'react';
import { fetchContentBlobUrl } from '../../../services/staticContentService';
import { bookPagePath } from '../../../utils/grammar/bookPagePath';

interface PictureSceneProps {
  page: number;
  /** left, top, width, height as 0–1 fractions of the page. */
  box: [number, number, number, number];
  alt: string;
}

/** A crop of the printed book 1 page, shown as the picture an exercise is about. */
export function PictureScene({ page, box, alt }: PictureSceneProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  /** Page width / height; a typical page until the scan loads. */
  const [pageRatio, setPageRatio] = useState(0.75);
  const [left, top, width, height] = box;

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

  if (failed) return null;
  return (
    <div
      className="relative mx-auto w-full overflow-hidden rounded-feature border-2 border-ui-divider bg-ui-surface"
      // Height capped so the dialogue below stays in view; width follows the crop's shape.
      style={{ aspectRatio: `${width * pageRatio} / ${height}`, maxWidth: `min(28rem, calc(min(30vh, 220px) * ${(width * pageRatio) / height}))` }}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          draggable={false}
          onLoad={(event) => setPageRatio(event.currentTarget.naturalWidth / event.currentTarget.naturalHeight)}
          className="absolute max-w-none select-none"
          style={{
            width: `${100 / width}%`,
            left: `${-(left / width) * 100}%`,
            top: `${-(top / height) * 100}%`,
          }}
        />
      ) : (
        <div role="status" aria-label="Loading picture" className="absolute inset-0 animate-pulse bg-ui-hover" />
      )}
    </div>
  );
}
