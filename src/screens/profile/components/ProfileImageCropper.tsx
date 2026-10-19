import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import {
  PROFILE_IMAGE_MAX_PIXELS,
  profileImageFileError,
  type ProfileImageCrop,
} from '../../../services/profileMedia';

type CropKind = 'avatar' | 'cover';
interface ImageSize { width: number; height: number }
interface FrameSize { width: number; height: number }
interface Position { x: number; y: number }
interface DragStart {
  pointerId: number;
  clientX: number;
  clientY: number;
  position: Position;
}

const clamp = (value: number) => Math.max(0, Math.min(1, value));

export function ProfileImageCropper({
  file,
  kind,
  busy = false,
  onCropChange,
}: {
  file: File;
  kind: CropKind;
  busy?: boolean;
  onCropChange: (crop: ProfileImageCrop | null) => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<DragStart | null>(null);
  const [source, setSource] = useState('');
  const [imageSize, setImageSize] = useState<ImageSize | null>(null);
  const [frameSize, setFrameSize] = useState<FrameSize>({ width: 0, height: 0 });
  const [position, setPosition] = useState<Position>({ x: 0.5, y: 0.5 });
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const aspect = kind === 'avatar' ? 1 : 4;

  useEffect(() => {
    const fileError = profileImageFileError(file);
    setImageSize(null);
    setError(fileError);
    setPosition({ x: 0.5, y: 0.5 });
    setZoom(1);
    if (fileError) { setSource(''); return; }

    const url = URL.createObjectURL(file);
    setSource(url);
    const image = new Image();
    image.onload = () => {
      if (image.naturalWidth * image.naturalHeight > PROFILE_IMAGE_MAX_PIXELS) {
        setError('That image is too large to edit. Choose one with fewer pixels.');
        return;
      }
      setImageSize({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => setError('This image could not be opened. Try another file.');
    image.src = url;
    return () => {
      image.onload = null;
      image.onerror = null;
      URL.revokeObjectURL(url);
    };
  }, [file]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const measure = () => setFrameSize({ width: frame.clientWidth, height: frame.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  const scale = imageSize && frameSize.width && frameSize.height
    ? Math.max(frameSize.width / imageSize.width, frameSize.height / imageSize.height) * zoom
    : 0;
  const imageWidth = imageSize ? imageSize.width * scale : 0;
  const imageHeight = imageSize ? imageSize.height * scale : 0;
  const maxX = Math.max(0, imageWidth - frameSize.width);
  const maxY = Math.max(0, imageHeight - frameSize.height);
  const crop = useMemo<ProfileImageCrop | null>(() => {
    if (!scale || !frameSize.width || !frameSize.height) return null;
    return {
      x: maxX * position.x / scale,
      y: maxY * position.y / scale,
      width: frameSize.width / scale,
      height: frameSize.height / scale,
    };
  }, [frameSize.height, frameSize.width, maxX, maxY, position.x, position.y, scale]);

  useEffect(() => onCropChange(error ? null : crop), [crop, error, onCropChange]);

  const move = (nextX: number, nextY: number) => setPosition({ x: clamp(nextX), y: clamp(nextY) });
  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (busy || !imageSize) return;
    event.preventDefault();
    dragStart.current = { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, position };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = dragStart.current;
    if (!start || start.pointerId !== event.pointerId) return;
    move(
      maxX ? start.position.x - (event.clientX - start.clientX) / maxX : 0.5,
      maxY ? start.position.y - (event.clientY - start.clientY) / maxY : 0.5,
    );
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const nudge = event.shiftKey ? 0.08 : 0.02;
    if (event.key === 'ArrowLeft') move(position.x - nudge, position.y);
    else if (event.key === 'ArrowRight') move(position.x + nudge, position.y);
    else if (event.key === 'ArrowUp') move(position.x, position.y - nudge);
    else if (event.key === 'ArrowDown') move(position.x, position.y + nudge);
    else return;
    event.preventDefault();
  };

  return <div className="profile-crop-editor">
    {error ? <p role="alert" className="text-sm font-bold text-feedback-danger-edge">{error}</p> : <>
      <div
        ref={frameRef}
        className={`profile-crop-frame ${kind === 'avatar' ? 'profile-crop-avatar' : 'profile-crop-cover'}`}
        role="group"
        aria-label={`Crop ${kind}; drag to reposition or use arrow keys`}
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={(event) => { if (dragStart.current?.pointerId === event.pointerId) dragStart.current = null; }}
        onPointerCancel={() => { dragStart.current = null; }}
        onKeyDown={handleKeyDown}
        style={{
          aspectRatio: String(aspect),
          backgroundImage: source ? `url("${source}")` : undefined,
          backgroundSize: imageSize ? `${imageWidth}px ${imageHeight}px` : undefined,
          backgroundPosition: `${position.x * 100}% ${position.y * 100}%`,
        }}
      />
      <div className="profile-crop-controls">
        <label htmlFor="profile-image-zoom" className="profile-field-label">Zoom</label>
        <input
          id="profile-image-zoom"
          type="range"
          min="1"
          max="3"
          step="0.05"
          value={zoom}
          onChange={(event) => setZoom(Number(event.target.value))}
          disabled={!imageSize || busy}
          className="w-full accent-brand-primary"
        />
        <button type="button" className="profile-crop-reset focus-ring" onClick={() => { setPosition({ x: 0.5, y: 0.5 }); setZoom(1); }} disabled={busy}>
          Reset
        </button>
      </div>
      <p className="profile-crop-instruction">Drag to position · use the slider to zoom</p>
    </>}
  </div>;
}
