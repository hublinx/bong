import { useState } from 'react';
import type { PhotoSize } from '../lib/backend/types';
import { usePhoto } from '../lib/photos';

export function PhotoImg({
  id,
  size = 'thumb',
  className = '',
  alt = '',
  onClick,
}: {
  id: string;
  size?: PhotoSize;
  className?: string;
  alt?: string;
  onClick?: () => void;
}) {
  const { url, onError } = usePhoto(id, size);
  const [loaded, setLoaded] = useState<string | null>(null);
  return (
    <div className={`photo ${loaded === url && url ? 'is-loaded' : ''} ${onClick ? 'is-clickable' : ''} ${className}`} onClick={onClick}>
      {url && <img src={url} alt={alt} draggable={false} referrerPolicy="no-referrer" onLoad={() => setLoaded(url)} onError={onError} />}
    </div>
  );
}
