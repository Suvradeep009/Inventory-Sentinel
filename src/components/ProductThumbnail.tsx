'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Package, Sparkles, ShoppingBag, Armchair, Wine } from 'lucide-react';

interface ProductThumbnailProps {
  src?: string;
  title: string;
  category?: string;
  size?: number;
  productId?: number;
  isButton?: boolean;
}

export default function ProductThumbnail({
  src,
  title,
  category = 'general',
  size = 32,
  productId,
  isButton = true,
}: ProductThumbnailProps) {
  const [hasError, setHasError] = useState(!src);

  const initials = (title || 'SK')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase())
    .join('') || 'SK';

  const catLower = category.toLowerCase();
  const bgBadgeColor =
    catLower.includes('beauty') ? '#FFD4E5' :
    catLower.includes('fragrance') ? '#E3D7FF' :
    catLower.includes('furniture') ? '#FFE8C2' :
    catLower.includes('grocer') ? '#D4F7E6' : '#EFECE3';

  // Category Icon fallback
  const renderCategoryIcon = () => {
    const iconSize = Math.max(12, Math.round(size * 0.5));
    if (catLower.includes('beauty')) return <Sparkles size={iconSize} />;
    if (catLower.includes('grocer')) return <ShoppingBag size={iconSize} />;
    if (catLower.includes('furniture')) return <Armchair size={iconSize} />;
    if (catLower.includes('fragrance')) return <Wine size={iconSize} />;
    return <Package size={iconSize} />;
  };

  const proxyUrl = src
    ? `/api/image-proxy?url=${encodeURIComponent(src)}&title=${encodeURIComponent(title)}&category=${encodeURIComponent(category)}`
    : null;

  const content = hasError || !proxyUrl ? (
    <div
      className="thumbnail-fallback"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: bgBadgeColor,
        border: '1px solid #000000',
        borderRadius: '3px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 800,
        fontFamily: 'var(--font-mono)',
        fontSize: `${Math.max(10, Math.round(size * 0.36))}px`,
        color: '#0A0A0A',
        lineHeight: 1,
        flexShrink: 0,
        userSelect: 'none',
        boxShadow: '1px 1px 0px #000000',
      }}
      title={`${title} (${category})`}
    >
      {initials}
    </div>
  ) : (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        border: '1px solid #000000',
        borderRadius: '3px',
        overflow: 'hidden',
        backgroundColor: bgBadgeColor,
        flexShrink: 0,
        boxShadow: '1px 1px 0px #000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <img
        src={proxyUrl}
        alt=""
        aria-label={title}
        referrerPolicy="no-referrer"
        crossOrigin="anonymous"
        loading="lazy"
        onError={() => setHasError(true)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
        }}
      />
    </div>
  );

  if (isButton && productId) {
    return (
      <Link
        href={`/insights?productId=${productId}`}
        className="thumbnail-btn"
        title={`Diagnose SKU #${productId}: ${title}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          textDecoration: 'none',
          cursor: 'pointer',
        }}
      >
        {content}
      </Link>
    );
  }

  return content;
}
