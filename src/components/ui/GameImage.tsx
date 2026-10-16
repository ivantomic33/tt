import React, { useState } from 'react';
import { Gamepad2 } from 'lucide-react';

interface GameImageProps {
  src?: string;
  alt: string;
  className?: string;
  aspectRatio?: '16/9' | '4/3' | '1/1' | 'auto';
}

export const GameImage: React.FC<GameImageProps> = ({
  src,
  alt,
  className = '',
  aspectRatio = '16/9',
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const aspectClass =
    aspectRatio === '16/9'
      ? 'aspect-[16/9]'
      : aspectRatio === '4/3'
      ? 'aspect-[4/3]'
      : aspectRatio === '1/1'
      ? 'aspect-square'
      : '';

  // Fallback visual representation if the remote image fails or isn't provided
  if (!src || hasError) {
    return (
      <div
        className={`relative overflow-hidden bg-gradient-to-br from-[#18181b] via-[#141414] to-[#0a0a0a] flex flex-col items-center justify-center border border-[#262626] ${aspectClass} ${className}`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(#a855f7_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />
        <Gamepad2 className="w-10 h-10 text-[#a855f7]/50 mb-2 relative z-10" />
        <span className="text-xs text-[#a1a1a1] px-4 text-center line-clamp-1 relative z-10 font-medium">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-[#141414] ${aspectClass} ${className}`}>
      {/* Loading placeholder skeleton */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-[#1c1c1c] animate-pulse" />
      )}
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
};
