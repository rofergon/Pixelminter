import React, { useState } from 'react';
import { Upload, ChevronUp, ChevronDown } from 'lucide-react';
import { State } from '@/types/types';
import { decodeImage, applyDecodedImage, validateImageFile } from '@/hooks/useDecodingImage';
import Alert from './Alert';

interface UploadPixelArtProps {
  state: State;
  updateState: (newState: Partial<State> | ((_prevState: State) => Partial<State>)) => void;
}

const UploadPixelArt: React.FC<UploadPixelArtProps> = ({ state, updateState }) => {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await validateImageFile(file);
      
      const decodedData = await decodeImage(file);
      applyDecodedImage(decodedData, state, (x, y, color) => {
        updateState((prevState) => {
          const currentFrame = prevState.frames[prevState.currentFrameIndex];
          const activeLayer = currentFrame.layers.find(layer => 
            layer.id === prevState.activeLayerId
          );
          
          if (activeLayer) {
            const newPixels = new Map(activeLayer.pixels);
            if (color === null) {
              newPixels.delete(`${x},${y}`);
            } else {
              newPixels.set(`${x},${y}`, color);
            }
            
            return {
              frames: prevState.frames.map((frame, index) => 
                index === prevState.currentFrameIndex
                  ? {
                      ...frame,
                      layers: frame.layers.map(layer =>
                        layer.id === prevState.activeLayerId
                          ? { ...layer, pixels: newPixels }
                          : layer
                      )
                    }
                  : frame
              )
            };
          }
          return {};
        });
      });

      // Simular un movimiento hacia la izquierda después de cargar la imagen
      setTimeout(() => {
        const event = new KeyboardEvent('keydown', {
          key: 'ArrowLeft',
          bubbles: true
        });
        window.dispatchEvent(event);
      }, 100);

    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred while loading the image');
    }
  };

  return (
    <>
      {error && (
        <Alert 
          message={error} 
          onClose={() => setError(null)}
        />
      )}
      <div className="tool-container rounded-md shadow-sm overflow-hidden bg-gray-800">
        <button
          onClick={() => setIsUploadOpen(!isUploadOpen)}
          className="w-full p-2 flex justify-between items-center text-left hover:bg-gray-700"
        >
          <h3 className="text-xs font-semibold flex items-center">
            <Upload className="mr-2" size={16} />Upload Pixel Art
          </h3>
          {isUploadOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        
        {isUploadOpen && (
          <div className="p-2 space-y-2">
            <p className="text-xs text-gray-300">
              Upload your pixel art (max resolution: 256x256, PNG format with transparency)
            </p>
            <input
              type="file"
              accept="image/png,image/jpeg,image/gif"
              onChange={handleImageUpload}
              className="hidden"
              id="image-upload"
            />
            <label
              htmlFor="image-upload"
              className="h-8 w-full bg-blue-600 text-gray-200 hover:bg-blue-700 transition-colors duration-300 flex items-center justify-center rounded-md cursor-pointer"
            >
              <Upload className="mr-1" size={12} />
              Upload Image
            </label>
          </div>
        )}
      </div>
    </>
  );
};

export default UploadPixelArt; 