import Image from 'next/image';
import React from 'react';

type BrandLogoProps = {
  className?: string;
  priority?: boolean;
  variant?: 'brand' | 'white';
};

export function BrandLogo({ className, priority = false, variant = 'brand' }: BrandLogoProps) {
  const source = variant === 'white' ? '/brand/logo-white.svg' : '/brand/logo.svg';

  return (
    <Image
      alt="Cuádrala"
      className={className}
      height={64}
      priority={priority}
      src={source}
      unoptimized
      width={64}
    />
  );
}
