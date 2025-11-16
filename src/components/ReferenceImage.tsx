/* eslint-disable no-unused-vars */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Draggable from 'react-draggable';
import { ResizableBox } from 'react-resizable';
import CustomImage from './CustomImage';

interface ReferenceImageProps {
  url: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  onPositionChange: (position: { x: number; y: number }) => void;
  onSizeChange: (size: { width: number; height: number }) => void;
  onUrlChange: (url: string) => void;
}

const ReferenceImage: React.FC<ReferenceImageProps> = ({
  url,
  position,
  size,
  onPositionChange,
  onSizeChange,
  onUrlChange,
}) => {
  const [opacity, setOpacity] = useState(100);
  const [imageUrl, setImageUrl] = useState(url);
  const [isValidUrl, setIsValidUrl] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const nodeRef = useRef(null);

  const isValidImageUrl = (url: string) => {
    return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:');
  };

  const handlePaste = useCallback((event: ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const objectUrl = URL.createObjectURL(blob);
            onUrlChange(objectUrl);
            setIsValidUrl(true);
            if (inputRef.current) {
              inputRef.current.value = objectUrl;
            }
            break;
          }
        }
      }
    }
  }, [onUrlChange]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.value = url;
    }
    setImageUrl(url);
    setIsValidUrl(isValidImageUrl(url));
  }, [url]);

  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [handlePaste]);

  const handleImageError = () => {
    console.error('Error al cargar la imagen:', imageUrl);
    setIsValidUrl(false);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      onUrlChange(objectUrl);
      setIsValidUrl(true);
    }
  };

  const handleUrlChange = (newUrl: string) => {
    onUrlChange(newUrl);
    setIsValidUrl(isValidImageUrl(newUrl));
  };

  return (
    <Draggable
      nodeRef={nodeRef}
      position={position}
      onStop={(e, data) => onPositionChange({ x: data.x, y: data.y })}
      handle=".drag-handle"
      cancel=".no-drag"
    >
      <div ref={nodeRef} className="absolute z-50 pointer-events-none">
        <ResizableBox
          width={size.width}
          height={size.height}
          onResize={(e: React.SyntheticEvent, { size }: { size: { width: number; height: number } }) => onSizeChange(size)}
          minConstraints={[100, 100]}
          maxConstraints={[800, 800]}
          className="flex flex-col border-2 border-slate-600 rounded-lg shadow-lg bg-slate-800"
          handle={<div className="absolute right-0 bottom-0 w-4 h-4 bg-slate-600 hover:bg-slate-500 cursor-se-resize pointer-events-auto rounded-bl-md transition-colors" />}
        >
          <div className="w-full h-full flex flex-col">
            <div className="flex items-center p-2 bg-slate-800 gap-2 drag-handle cursor-move pointer-events-auto border-b border-slate-700">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 flex-shrink-0 text-slate-400 hover:text-slate-200 transition-colors">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 5.25h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5" />
              </svg>
              <input
                ref={inputRef}
                type="url"
                className="block w-full rounded-md border-0 py-1.5 px-2 text-slate-200 bg-slate-700 shadow-sm ring-1 ring-inset ring-slate-600 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 text-xs leading-6 no-drag"
                placeholder="URL: https://example.com/image.png o pega una imagen"
                onChange={(e) => handleUrlChange(e.target.value)}
                aria-label="Reference image URL"
              />
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden no-drag"
                id="file-upload"
              />
              <label 
                htmlFor="file-upload" 
                className="cursor-pointer bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-md text-xs font-medium transition-colors no-drag"
              >
                Upload
              </label>
              <div className="no-drag">
                <input
                  id="opacity"
                  type="range"
                  min="0"
                  max="100"
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                  className="no-drag"
                  aria-label="Ajustar opacidad"
                />
              </div>
            </div>
            <div className="relative flex-grow">
              {isValidUrl && (
                <div style={{ opacity: opacity / 100 }}>
                  <CustomImage
                    src={imageUrl}
                    alt="Reference image"
                    layout="fill"
                    objectFit="contain"
                    onError={handleImageError}
                  />
                </div>
              )}
            </div>
          </div>
        </ResizableBox>
      </div>
    </Draggable>
  );
};

export default ReferenceImage;