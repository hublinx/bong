import { useState } from 'react';
import { usePhoto, type PhotoSize } from '../lib/photos';

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
  const { url } = usePhoto(id, size);
  const [loaded, setLoaded] = useState(false);
  return (
    <div className={`photo ${loaded ? 'is-loaded' : ''} ${onClick ? 'is-clickable' : ''} ${className}`} onClick={onClick}>
      {url && <img src={url} alt={alt} draggable={false} onLoad={() => setLoaded(true)} />}
    </div>
  );
}
