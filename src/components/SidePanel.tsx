/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable no-unused-vars */
import React, { useMemo, useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import ColorPalette from '@/components/ColorPalette';
import CustomPalette from '@/components/CustomPalette';
import ConnectWalletButton from '@/components/ConnectWalletButton';
import LayerManager from '@/components/LayerPanel';
import { State, BrushData } from '@/types/types';
import { Palette, Grid, Save, Droplet, Layers, Plus, Download, Eye, Upload, Trash2 } from 'lucide-react';
import { useSidePanelLogic } from '@/hooks/useSidePanelLogic';
import { usePixelCountAndDroplets } from '@/hooks/tools/usePixelCount';
import MintBPButton from '@/components/MintBPButton';
import MintPixelminterButton from '@/components/MintPixelminterButton';
import { encodePixelData } from '@/hooks/useEncodingUtils';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { decodeImage, applyDecodedImage, validateImageFile } from '@/hooks/useDecodingImage';
import UploadPixelArt from '@/components/UploadPixelArt';
import { clearCache } from '@/hooks/useCacheState';
import PaletteButton from './PaletteButton';

interface SidePanelProps {
  state: State;
  updateState: (newState: Partial<State> | ((prevState: State) => Partial<State>)) => void;
  handleExtractPalette: () => void;
  onGridSizeChange: (newSize: number) => void;
  isExporting: boolean;
  addLayer: () => void;
  removeLayer: (id: string) => void;
  updateLayerVisibility: (id: string, visible: boolean) => void;
  updateLayerOpacity: (id: string, opacity: number) => void;
  setActiveLayerId: (id: string) => void;
  updateLayerName: (id: string, name: string) => void;
  reorderLayers: (sourceIndex: number, targetIndex: number) => void;
  brushData: BrushData | null;
  updateBrushData: (data: BrushData | null) => void;
  toggleOnionSkinning: () => void;
  updateOnionSkinningOpacity: (opacity: number) => void;
  isOpen: boolean;
}

const SidePanel: React.FC<SidePanelProps> = ({
  state,
  updateState,
  handleExtractPalette,
  onGridSizeChange,
  isExporting,
  addLayer,
  removeLayer,
  updateLayerVisibility,
  updateLayerOpacity,
  setActiveLayerId,
  updateLayerName,
  reorderLayers,
  brushData,
  updateBrushData,
  toggleOnionSkinning,
  updateOnionSkinningOpacity,
  isOpen,
}) => {
  const [encodedData, setEncodedData] = useState<string | null>(null);

  const {
    isClient,
    toggleBackgroundImage,
    handleAddCustomColor,
    handleClearCustomPalette,
    handleEncodeData
  } = useSidePanelLogic(state, updateState, handleExtractPalette, onGridSizeChange);
  const [isCustomPaletteOpen, setIsCustomPaletteOpen] = useState(false);
  const [isLayersOpen, setIsLayersOpen] = useState(false);
  const [isGridSizeOpen, setIsGridSizeOpen] = useState(false);
  const [isOnionSkinningOpen, setIsOnionSkinningOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const initialDroplets = useMemo(() => brushData?.pixelsPerDay || state.pixelsPerDay || 0, [brushData, state.pixelsPerDay]);

  const { pixelCount, droplets } = usePixelCountAndDroplets(state, initialDroplets);

  const resetEncodedState = () => {
    setEncodedData(null);
  };

  const handleEncode = () => {
    const data = encodePixelData(state);
    setEncodedData(data);
  };

  const handleClearCache = useCallback(() => {
    if (window.confirm(
      'WARNING: Only use this button if you are experiencing bugs or issues.\n\n' +
      'This action will:\n' +
      '- Delete all your saved artwork\n' +
      '- Clear your entire drawing history\n' +
      '- Remove all custom palettes\n' +
      '- Reset all settings to default\n\n' +
      'This action cannot be undone. Are you sure you want to proceed?'
    )) {
      clearCache();
      window.location.reload();
    }
  }, []);

  return (
    <div
      id='side-panel'
      className={`flex-grow bg-gray-900 text-gray-200 transition-all duration-300 ${
        isOpen ? 'w-full max-w-xs p-3 space-y-3' : 'w-12 p-1'
      }`}
    >
      {isOpen ? (
        <div className="space-y-3 h-full overflow-y-auto">
          <div className="tool-container rounded-md shadow-sm overflow-hidden bg-gray-800">
            <div className="p-2">
              <h3 className="text-xs font-semibold flex items-center mb-3">
                <Palette className="mr-2" size={16} />
                Basepaint
                {isClient && state.palette.length > 0 && (
                  `: ${state.theme}`
                )}
              </h3>

              <div className="flex items-center space-x-2 mb-3">
                <div className="h-8 bg-gray-700 px-3 py-1 rounded-md shadow-sm flex items-center justify-center">
                  <Droplet className="text-yellow-300 fill-yellow-300" size={12} />
                  <span className="text-yellow-300 font-semibold text-xs ml-1 font-variant-numeric tabular-nums">
                    {droplets}
                  </span>
                </div>

                <ConnectWalletButton updateBrushData={updateBrushData} />
              </div>

              <Button
                onClick={handleExtractPalette}
                disabled={state.isPaletteLoading || isExporting}
                className="h-8 w-full bg-blue-600 text-gray-200 hover:bg-blue-700 transition-colors duration-300"
              >
                {state.isPaletteLoading ? 'Loading...' : 'Get Today\'s Palette'}
              </Button>

              {isClient && state.palette.length > 0 && (
                <div className="mt-4">
                  <ColorPalette
                    onColorSelect={(color: string) => updateState({ color })}
                    palette={state.palette}
                    theme={state.theme}
                  />
                </div>
              )}

              <div className="mt-3">
                <h4 className="text-xs font-semibold mb-1">Background Opacity</h4>
                <Slider
                  id="backgroundOpacity"
                  min={0}
                  max={1}
                  step={0.01}
                  value={[state.backgroundOpacity || 0]}
                  onValueChange={(value: number[]) => updateState({ backgroundOpacity: value[0] })}
                  className="w-full"
                />
                <p className="text-center text-xs mt-1">
                  {Math.round((state.backgroundOpacity || 0) * 100)}%
                </p>
              </div>

              <div className="mt-3 bg-gray-700 p-2 rounded-md shadow-sm">
                <p className="text-xs font-semibold flex items-center text-gray-200">
                  Pixels used: <span className="font-variant-numeric tabular-nums ml-1">{pixelCount}</span>
                </p>
              </div>

              <Button
                onClick={handleEncode}
                className="h-8 mt-2 w-full bg-blue-600 text-gray-200 hover:bg-blue-700 transition-colors duration-300"
              >
                <Save className="mr-1" size={12} aria-hidden="true" />
                Commit To Basepaint
              </Button>

              {encodedData && (
                <MintBPButton
                  state={state}
                  encodedData={encodedData}
                  resetEncodedState={resetEncodedState}
                  onEncode={handleEncode}
                />
              )}
            </div>
          </div>

          <div className="tool-container rounded-md shadow-sm overflow-hidden bg-gray-800">
            <button
              onClick={() => setIsCustomPaletteOpen(!isCustomPaletteOpen)}
              className="w-full p-2 flex justify-between items-center text-left hover:bg-gray-700"
            >
              <h3 className="text-xs font-semibold flex items-center"><Plus className="mr-2" size={16} />Custom Palette</h3>
              {isCustomPaletteOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {isCustomPaletteOpen && (
              <div className="px-2 pb-2">
                <CustomPalette
                  customPalette={state.customPalette}
                  onAddColor={handleAddCustomColor}
                  onColorSelect={(color: string) => updateState({ color })}
                  currentColor={state.color}
                  onClearPalette={handleClearCustomPalette}
                />
              </div>
            )}
          </div>

          <div className="tool-container rounded-md shadow-sm overflow-hidden bg-gray-800">
            <button
              onClick={() => setIsLayersOpen(!isLayersOpen)}
              className="w-full p-2 flex justify-between items-center text-left hover:bg-gray-700"
            >
              <h3 className="text-xs font-semibold flex items-center"><Layers className="mr-2" size={16} />Layers</h3>
              {isLayersOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {isLayersOpen && (
              <div className="p-2">
                <LayerManager
                  state={state}
                  addLayer={addLayer}
                  removeLayer={removeLayer}
                  updateLayerVisibility={updateLayerVisibility}
                  updateLayerOpacity={updateLayerOpacity}
                  setActiveLayerId={setActiveLayerId}
                  updateLayerName={updateLayerName}
                  reorderLayers={reorderLayers}
                />
              </div>
            )}
          </div>

          <div className="tool-container rounded-md shadow-sm overflow-hidden bg-gray-800">
            <button
              onClick={() => setIsGridSizeOpen(!isGridSizeOpen)}
              className="w-full p-2 flex justify-between items-center text-left hover:bg-gray-700"
            >
              <h3 className="text-xs font-semibold flex items-center"><Grid className="mr-2" size={16} />Grid Size</h3>
              {isGridSizeOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {isGridSizeOpen && (
              <div className="p-2">
                <Slider
                  min={8}
                  max={256}
                  step={8}
                  value={[state.gridSize]}
                  onValueChange={(value) => onGridSizeChange(value[0])}
                  className="w-full"
                />
                <p className="text-center text-xs mt-1 font-medium">
                  <span className="font-variant-numeric tabular-nums">{state.gridSize}</span>x<span className="font-variant-numeric tabular-nums">{state.gridSize}</span>
                </p>
              </div>
            )}
          </div>

          <div className="tool-container rounded-md shadow-sm overflow-hidden bg-gray-800">
            <button
              onClick={() => setIsOnionSkinningOpen(!isOnionSkinningOpen)}
              className="w-full p-2 flex justify-between items-center text-left hover:bg-gray-700"
            >
              <h3 className="text-xs font-semibold flex items-center">
                <Eye className="mr-2" size={16} />Onion Skinning
              </h3>
              {isOnionSkinningOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {isOnionSkinningOpen && (
              <div className="p-2 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs">Enable</span>
                  <Switch
                    checked={state.onionSkinning}
                    onCheckedChange={toggleOnionSkinning}
                  />
                </div>
                {state.onionSkinning && (
                  <div className="space-y-1">
                    <p className="text-xs">Opacity</p>
                    <Slider
                      min={0}
                      max={1}
                      step={0.1}
                      value={[state.onionSkinningOpacity]}
                      onValueChange={(value) => updateOnionSkinningOpacity(value[0])}
                      className="w-full"
                    />
                    <p className="text-center text-xs">
                      {Math.round(state.onionSkinningOpacity * 100)}%
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <UploadPixelArt 
            state={state}
            updateState={updateState}
          />

          <MintPixelminterButton 
            state={state} 
            fps={state.fps}
          />

          <div className="tool-container rounded-md shadow-sm overflow-hidden bg-gray-800">
            <button
              onClick={handleClearCache}
              className="w-full p-2 flex items-center justify-between text-left hover:bg-red-700 text-red-500 hover:text-white transition-colors duration-300"
            >
              <span className="text-xs font-semibold flex items-center">
                <Trash2 className="mr-2" size={16} />
                Clear Saved Data
              </span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col space-y-1">
          <div className="h-14 bg-gray-800 rounded-md mb-2 p-1 flex flex-col items-center justify-center">
            <Droplet className="text-yellow-300 fill-yellow-300" size={14} />
            <span className="text-yellow-300 font-semibold text-xs mt-1 font-variant-numeric tabular-nums">
              {droplets}
            </span>
          </div>

          {state.palette.map((color, index) => (
            <PaletteButton
              key={index}
              color={color}
              isSelected={state.color === color}
              onClick={() => updateState({ color })}
            />
          ))}
          {state.customPalette.map((color, index) => (
            <PaletteButton
              key={`custom-${index}`}
              color={color}
              isSelected={state.color === color}
              onClick={() => updateState({ color })}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default SidePanel;