import React, { useState, useEffect } from 'react';
import Image from 'next/image';

interface CustomImageProps {
  src: string;
  alt: string;
  layout: "fill" | "fixed" | "intrinsic" | "responsive";
  objectFit?: "contain" | "cover" | "fill" | "none" | "scale-down";
  onError?: () => void;
}

const CustomImage: React.FC<CustomImageProps> = ({ src, alt, layout, objectFit, onError }) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isBlob, setIsBlob] = useState(false);

  useEffect(() => {
    if (src && (src.startsWith('blob:') || src.startsWith('data:'))) {
      setImageSrc(src);
      setIsBlob(true);
    } else if (src && (src.startsWith('http://') || src.startsWith('https://'))) {
      setImageSrc(src);
      setIsBlob(false);
    } else {
      setImageSrc(null);
      setIsBlob(false);
    }
  }, [src]);

  if (!imageSrc) {
    return null;
  }

  if (isBlob) {
    return (
      <img
        src={imageSrc}
        alt={alt}
        style={{ objectFit, width: '100%', height: '100%' }}
        onError={() => {
          console.error('Error al cargar la imagen:', src);
          if (onError) onError();
        }}
      />
    );
  }

  return (
    <Image
      src={imageSrc}
      alt={alt}
      layout={layout}
      objectFit={objectFit}
      onError={() => {
        console.error('Error al cargar la imagen:', src);
        if (onError) onError();
      }}
      width={layout === 'fill' ? undefined : 100}
      height={layout === 'fill' ? undefined : 100}
    />
  );
};

export default CustomImage;