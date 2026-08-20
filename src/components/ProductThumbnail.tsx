import React, { useEffect, useState } from 'react';

interface ProductThumbnailProps {
  src?: string | null;
  /** Rendered box size in px (default 36). */
  size?: number;
}

/**
 * Compact product thumbnail shown beside the variant/features area.
 * Renders nothing when there is no URL or when the image fails to load,
 * so the surrounding layout is never affected.
 */
export function ProductThumbnail({ src, size = 36 }: ProductThumbnailProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => { setFailed(false); }, [src]);

  if (!src || failed) return null;

  return (
    <div
      className="rounded-md border bg-muted overflow-hidden flex items-center justify-center self-start"
      style={{ width: size, height: size, flex: `0 0 ${size}px`, maxWidth: size }}
    >
      <img
        src={src}
        alt=""
        aria-hidden="true"
        loading="lazy"
        onError={() => setFailed(true)}
        style={{ width: size, height: size, objectFit: 'contain', display: 'block' }}
      />
    </div>
  );
}
