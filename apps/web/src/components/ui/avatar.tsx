import React from 'react';

export function Avatar({
  src,
  alt,
  className = '',
}: { src: string; alt?: string; className?: string }) {
  return (
    <img
      src={src}
      alt={alt}
      className={`rounded-full object-cover ${className}`}
    />
  );
}
