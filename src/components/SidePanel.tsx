/* eslint-disable jsx-a11y/alt-text */
import React, { useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import ColorPalette from '@/components/ColorPalette';
import CustomPalette from '@/components/CustomPalette';
import ConnectWalletButton from '@/components/ConnectWalletButton';
import LayerManager from '@/components/LayerPanel';
import { State, BrushData } from '@/types/types';
import { Palette, Grid, Save, Droplet, Layers, Plus, Eye, Trash2, BookOpen } from 'lucide-react';
import { useSidePanelLogic } from '@/hooks/useSidePanelLogic';
import { usePixelCountAndDroplets } from '@/hooks/tools/usePixelCount';
import MintBPButton from '@/components/MintBPButton';
import MintPixelminterButton from '@/components/MintPixelminterButton';
import { encodePixelData } from '@/hooks/useEncodingUtils';
import { ChevronDown, ChevronUp } from 'lucide-react';
import UploadPixelArt from '@/components/UploadPixelArt';
import { clearCache } from '@/hooks/useCacheState';
import PaletteButton from './PaletteButton';

interface SidePanelProps {
  state: State;
  updateState: (_newState: Partial<State> | ((_prevState: State) => Partial<State>)) => void;
  handleExtractPalette: () => void;
  onGridSizeChange: (_newSize: number) => void;
  addLayer: () => void;
  removeLayer: (_id: string) => void;
  updateLayerVisibility: (_id: string, _visible: boolean) => void;
  updateLayerOpacity: (_id: string, _opacity: number) => void;
  setActiveLayerId: (_id: string) => void;
  updateLayerName: (_id: string, _name: string) => void;
  reorderLayers: (_sourceIndex: number, _targetIndex: number) => void;
  brushData: BrushData | null;
  updateBrushData: (_data: BrushData | null) => void;
  toggleOnionSkinning: () => void;
  updateOnionSkinningOpacity: (_opacity: number) => void;
  isOpen: boolean;
}

const SidePanel: React.FC<SidePanelProps> = ({
  state,
  updateState,
  handleExtractPalette,
  onGridSizeChange,
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
    toggleBackgroundImage: _toggleBackgroundImage,
    handleAddCustomColor,
    handleClearCustomPalette,
    handleEncodeData: _handleEncodeData
  } = useSidePanelLogic(state, updateState, handleExtractPalette, onGridSizeChange);
  const [isCustomPaletteOpen, setIsCustomPaletteOpen] = useState(false);
  const [isLayersOpen, setIsLayersOpen] = useState(false);
  const [isGridSizeOpen, setIsGridSizeOpen] = useState(false);
  const [isOnionSkinningOpen, setIsOnionSkinningOpen] = useState(false);
  const [_isUploadOpen, _setIsUploadOpen] = useState(false);

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
      className={`glass-panel pixel-scrollbar transition-all duration-300 bg-slate-800 h-full flex flex-col ${
        isOpen ? 'w-full max-w-md' : 'w-12 p-1'
      }`}
    >
      {isOpen ? (
        <div className="space-y-3 overflow-y-auto overflow-x-hidden pixel-scrollbar p-3 flex-1">
          <div className="tool-container rounded-lg shadow-md overflow-hidden">
            <div className="p-3">
              <h3 className="text-sm font-medium flex items-center mb-3 text-slate-300">
                <Palette className="mr-2 text-slate-400" size={16} />
                <span className="text-slate-200">
                  Basepaint
                </span>
                {isClient && state.palette.length > 0 && (
                  <span className="ml-2 text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-md">
                    {state.theme}
                  </span>
                )}
              </h3>

              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-20 bg-slate-800 px-2 py-1 rounded-lg shadow-sm flex items-center justify-center flex-shrink-0 border border-slate-700">
                  <Droplet className="text-amber-400 fill-amber-400" size={12} />
                  <span className="text-amber-400 font-medium text-xs ml-1 font-mono">
                    {droplets}
                  </span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <ConnectWalletButton updateBrushData={updateBrushData} />
                </div>
              </div>

              <Button
                onClick={handleExtractPalette}
                disabled={state.isPaletteLoading}
                className="h-8 w-full bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-600"
              >
                {state.isPaletteLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-slate-300 mr-2"></div>
                    Loading...
                  </div>
                ) : (
                  'Get Today\'s Palette'
                )}
              </Button>

              {isClient && state.palette.length > 0 && (
                <div className="mt-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                  <ColorPalette
                    onColorSelect={(color: string) => updateState({ color })}
                    palette={state.palette}
                    theme={state.theme}
                  />
                </div>
              )}

              <div className="mt-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                <h4 className="text-xs font-medium mb-2 text-slate-300 flex items-center">
                  <Eye className="mr-1 text-slate-400" size={14} />
                  Background Opacity
                </h4>
                <Slider
                  id="backgroundOpacity"
                  min={0}
                  max={1}
                  step={0.01}
                  value={[state.backgroundOpacity || 0]}
                  onValueChange={(value: number[]) => updateState({ backgroundOpacity: value[0] })}
                  className="w-full"
                />
                <p className="text-center text-xs mt-1 text-slate-400 font-mono bg-slate-700 px-2 py-0.5 rounded-md inline-block">
                  {Math.round((state.backgroundOpacity || 0) * 100)}%
                </p>
              </div>

              <div className="mt-3 bg-slate-800/30 p-2 rounded-lg shadow-sm border border-slate-700/50">
                <p className="text-xs font-medium flex items-center text-slate-300">
                  <Grid className="mr-1" size={14} />
                  Pixels used: 
                  <span className="font-mono ml-1 bg-slate-700 px-1.5 py-0.5 rounded text-slate-200">
                    {pixelCount}
                  </span>
                </p>
              </div>

              <Button
                onClick={handleEncode}
                className="h-8 mt-3 w-full bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md border border-slate-600"
              >
                <Save className="mr-1" size={14} aria-hidden="true" />
                Commit To Basepaint
              </Button>

              {encodedData && (
                <div className="mt-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
                  <MintBPButton
                    state={state}
                    encodedData={encodedData}
                    resetEncodedState={resetEncodedState}
                    onEncode={handleEncode}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="tool-container rounded-lg shadow-md overflow-hidden">
            <button
              onClick={() => setIsCustomPaletteOpen(!isCustomPaletteOpen)}
              className="w-full p-2.5 flex justify-between items-center text-left hover:bg-slate-700/30 transition-all duration-200 rounded-t-lg"
            >
              <h3 className="text-xs font-medium flex items-center text-slate-300"><Plus className="mr-1" size={14} />Custom Palette</h3>
              {isCustomPaletteOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {isCustomPaletteOpen && (
              <div className="px-2.5 pb-2.5">
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

          <div className="tool-container rounded-lg shadow-md overflow-hidden">
            <button
              onClick={() => setIsLayersOpen(!isLayersOpen)}
              className="w-full p-2.5 flex justify-between items-center text-left hover:bg-slate-700/30 transition-all duration-200 rounded-t-lg"
            >
              <h3 className="text-xs font-medium flex items-center text-slate-300"><Layers className="mr-1" size={14} />Layers</h3>
              {isLayersOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {isLayersOpen && (
              <div className="p-2.5">
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

          <div className="tool-container rounded-lg shadow-md overflow-hidden">
            <button
              onClick={() => setIsGridSizeOpen(!isGridSizeOpen)}
              className="w-full p-2.5 flex justify-between items-center text-left hover:bg-slate-700/30 transition-all duration-200 rounded-t-lg"
            >
              <h3 className="text-xs font-medium flex items-center text-slate-300"><Grid className="mr-1" size={14} />Grid Size</h3>
              {isGridSizeOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {isGridSizeOpen && (
              <div className="p-2.5">
                <Slider
                  min={8}
                  max={256}
                  step={8}
                  value={[state.gridSize]}
                  onValueChange={(value) => onGridSizeChange(value[0])}
                  className="w-full"
                />
                <p className="text-center text-xs mt-1 text-slate-400 font-mono bg-slate-700 px-2 py-0.5 rounded-md inline-block">
                  <span className="font-mono">{state.gridSize}</span>x<span className="font-mono">{state.gridSize}</span>
                </p>
              </div>
            )}
          </div>

          <div className="tool-container rounded-lg shadow-md overflow-hidden">
            <button
              onClick={() => setIsOnionSkinningOpen(!isOnionSkinningOpen)}
              className="w-full p-2.5 flex justify-between items-center text-left hover:bg-slate-700/30 transition-all duration-200 rounded-t-lg"
            >
              <h3 className="text-xs font-medium flex items-center text-slate-300">
                <Eye className="mr-1" size={14} />Onion Skinning
              </h3>
              {isOnionSkinningOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {isOnionSkinningOpen && (
              <div className="p-2.5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs">Enable</span>
                  <Switch
                    checked={state.onionSkinning}
                    onCheckedChange={toggleOnionSkinning}
                  />
                </div>
                {state.onionSkinning && (
                  <div className="space-y-0.5">
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

          <div className="tool-container rounded-lg shadow-md overflow-hidden border border-slate-700/60">
            <div className="p-3 space-y-2">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <BookOpen className="text-indigo-300" size={16} />
                NFT Library
              </h3>
              <p className="text-xs text-slate-400">
                View the GIFs you have minted on Pixelminter.
              </p>
              <Button
                asChild
                className="w-full h-8 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                <Link href="/library">
                  Open Library
                </Link>
              </Button>
            </div>
          </div>

          <div className="tool-container rounded-lg shadow-md overflow-hidden">
            <button
              onClick={handleClearCache}
              className="w-full p-2.5 flex items-center justify-between text-left hover:bg-red-700 text-red-500 hover:text-white transition-colors duration-200"
            >
              <span className="text-xs font-medium flex items-center">
                <Trash2 className="mr-1" size={14} />
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
