import { PhotoImg } from './PhotoImg';

/** Bố cục ảnh dạng collage cho 1–4+ tấm. */
export function PhotoMosaic({ ids, onOpen }: { ids: string[]; onOpen?: (index: number) => void }) {
  if (!ids.length) return null;
  const shown = ids.slice(0, 4);
  const extra = ids.length - shown.length;
  return (
    <div className={`mosaic mosaic--${shown.length}`}>
      {shown.map((id, i) => (
        <div className="mosaic__cell" key={id}>
          <PhotoImg id={id} onClick={onOpen ? () => onOpen(i) : undefined} />
          {extra > 0 && i === shown.length - 1 && (
            <button className="mosaic__more" onClick={() => onOpen?.(i)}>
              +{extra}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
