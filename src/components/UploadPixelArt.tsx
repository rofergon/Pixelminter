import React, { useState } from 'react';
import { Upload, ChevronUp, ChevronDown } from 'lucide-react';
import { State } from '@/types/types';
import { decodeImage, applyDecodedImage, validateImageFile } from '@/hooks/useDecodingImage';
import Alert from './Alert';

// Props interface for the UploadPixelArt component
interface UploadPixelArtProps {
  state: State; // Current application state
  updateState: (_newState: Partial<State> | ((_prevState: State) => Partial<State>)) => void; // Function to update state
}

/**
 * UploadPixelArt component provides functionality to upload and import pixel art images
 * Features:
 * - File validation (format, size constraints)
 * - Image decoding and processing
 * - Integration with the pixel art editor's layer system
 * - Error handling and user feedback
 * - Collapsible UI panel
 */
const UploadPixelArt: React.FC<UploadPixelArtProps> = ({ state, updateState }) => {
  // Local state to control the visibility of the upload panel
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  // Local state to handle and display error messages
  const [error, setError] = useState<string | null>(null);

  /**
   * Handles the image upload process
   * @param event - File input change event
   */
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Validate the uploaded file (format, size, etc.)
      await validateImageFile(file);
      
      // Decode the image data into pixel information
      const decodedData = await decodeImage(file);
      
      // Apply the decoded image data to the current active layer
      applyDecodedImage(decodedData, state, (x, y, color) => {
        updateState((prevState) => {
          // Get the current frame and active layer
          const currentFrame = prevState.frames[prevState.currentFrameIndex];
          const activeLayer = currentFrame.layers.find(layer => 
            layer.id === prevState.activeLayerId
          );
          
          if (activeLayer) {
            // Create a new pixel map with the updated pixel data
            const newPixels = new Map(activeLayer.pixels);
            if (color === null) {
              // Remove pixel if color is null (transparent)
              newPixels.delete(`${x},${y}`);
            } else {
              // Set pixel color
              newPixels.set(`${x},${y}`, color);
            }
            
            // Return updated state with new pixel data
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
          return {}; // Return empty object if no active layer found
        });
      });

      // Simulate a left arrow key press after loading the image
      // This triggers any frame shifting or navigation functionality
      setTimeout(() => {
        const event = new KeyboardEvent('keydown', {
          key: 'ArrowLeft',
          bubbles: true
        });
        window.dispatchEvent(event);
      }, 100);

    } catch (error) {
      // Handle and display any errors that occur during upload/processing
      setError(error instanceof Error ? error.message : 'An error occurred while loading the image');
    }
  };

  return (
    <>
      {/* Error alert component - only shown when there's an error */}
      {error && (
        <Alert 
          message={error} 
          onClose={() => setError(null)}
        />
      )}
      
      {/* Main upload component container */}
      <div className="tool-container rounded-md shadow-sm overflow-hidden bg-gray-800">
        {/* Collapsible header button */}
        <button
          onClick={() => setIsUploadOpen(!isUploadOpen)}
          className="w-full p-2 flex justify-between items-center text-left hover:bg-gray-700"
        >
          <h3 className="text-xs font-semibold flex items-center">
            <Upload className="mr-2" size={16} />Upload Pixel Art
          </h3>
          {/* Toggle icon based on panel state */}
          {isUploadOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        
        {/* Collapsible content area */}
        {isUploadOpen && (
          <div className="p-2 space-y-2">
            {/* Information text about upload constraints */}
            <p className="text-xs text-gray-300">
              Upload your pixel art (max resolution: 256x256, PNG format with transparency)
            </p>
            
            {/* Hidden file input element */}
            <input
              type="file"
              accept="image/png,image/jpeg,image/gif" // Accept common image formats
              onChange={handleImageUpload}
              className="hidden"
              id="image-upload"
            />
            
            {/* Styled label that acts as the upload button */}
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