import type { Author } from '../types';
import { useAuthorName, useData } from '../lib/data';

export function Avatar({ author, size = 32 }: { author?: Author; size?: number }) {
  const { doc } = useData();
  const nameOf = useAuthorName();
  const pic = author?.email ? doc.members[author.email]?.picture : undefined;
  const name = nameOf(author) || '?';
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.42 }} title={name}>
      {pic ? <img src={pic} alt="" referrerPolicy="no-referrer" /> : name.charAt(0).toUpperCase()}
    </span>
  );
}
