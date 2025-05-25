/* eslint-disable no-unused-vars */
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Plus, Play, Pause, SkipForward, SkipBack, Download } from 'lucide-react';
import { Button } from "../components/ui/button";
import { Slider } from "../components/ui/slider";
import { Switch } from "../components/ui/switch";
import FrameThumbnail from './FrameThumbnail';
import { State, Frame } from '../types/types';
import { useExportGif } from '../hooks/animation/useExportGif';
import { useAnimationControl } from '../hooks/animation/useAnimationControl';
import { useAnimationStatus } from '../hooks/animation/useAnimationStatus';

// Hook personalizado para detectar pantallas grandes
const useIsLargeScreen = (minWidth: number = 1024) => {
  const [isLargeScreen, setIsLargeScreen] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsLargeScreen(window.innerWidth >= minWidth);
    };

    // Verificar al cargar
    checkScreenSize();

    // Escuchar cambios de tamaño
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, [minWidth]);

  return isLargeScreen;
};

interface AnimationControlsProps {
  state: State;
  fps: number;
  setFps: (fps: number) => void; // Actualizamos el tipo de setFps
  updateState: (newState: Partial<State> | ((prevState: State) => Partial<State>)) => void;
  saveState: () => void;
  updateCanvasDisplay: () => void;
  day: number;
}

const AnimationControls: React.FC<AnimationControlsProps> = React.memo(({
  state,
  fps,
  setFps,
  updateState,
  saveState,
  updateCanvasDisplay,
  day,
}) => {
  const { isPlaying, setIsPlaying, changeFrame } = useAnimationControl(state, fps, updateState, updateCanvasDisplay);
  const { exportGif, isExporting } = useExportGif(state, fps);
  const [showFrames, setShowFrames] = useState(true);
  const { seconds, frame } = useAnimationStatus(day);

  const handleDownloadGif = useCallback(async () => {
    try {
      const gifBlob = await exportGif();
      const url = URL.createObjectURL(gifBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'animation.gif';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error al descargar el GIF:', error);
    }
  }, [exportGif]);

  const addFrame = useCallback(() => {
    updateState(prev => {
      const newFrame: Frame = {
        layers: prev.frames[prev.currentFrameIndex].layers.map(layer => ({
          ...layer,
          pixels: new Map(layer.pixels)
        })),
        history: [],
        historyIndex: -1
      };
      const newFrames = [...prev.frames.slice(0, prev.currentFrameIndex + 1), newFrame, ...prev.frames.slice(prev.currentFrameIndex + 1)];
      return { frames: newFrames, currentFrameIndex: prev.currentFrameIndex + 1 };
    });
    saveState();
    updateCanvasDisplay();
  }, [updateState, saveState, updateCanvasDisplay]);

  const deleteFrame = useCallback((index: number) => {
    if (state.frames.length > 1) {
      updateState(prev => ({
        frames: prev.frames.filter((_, i) => i !== index),
        currentFrameIndex: Math.min(prev.currentFrameIndex, prev.frames.length - 2),
      }));
      saveState();
      updateCanvasDisplay();
    }
  }, [state.frames.length, updateState, saveState, updateCanvasDisplay]);

  const handleFrameSelect = useCallback((index: number) => {
    updateState({ currentFrameIndex: index });
    updateCanvasDisplay();
  }, [updateState, updateCanvasDisplay]);

  const buttonStyle = useMemo(() => "w-8 h-8 p-1.5 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-slate-200 border border-slate-700 hover:border-slate-600 rounded-lg transition-all duration-200 hover:scale-105 shadow-sm", []);

  const isLargeScreen = useIsLargeScreen(1024);

  const renderControls = useMemo(() => (
    <div className="flex items-center justify-between gap-2 mb-2">
      <div className="flex items-center space-x-2">
        <Button onClick={addFrame} className={`${buttonStyle} bg-slate-700 hover:bg-slate-600 text-slate-200 border-slate-600`}>
          <Plus className="w-4 h-4" />
        </Button>
        <Button onClick={() => setIsPlaying(!isPlaying)} className={`${buttonStyle} ${isPlaying ? 'bg-red-700 hover:bg-red-600 text-red-200 border-red-600' : 'bg-green-700 hover:bg-green-600 text-green-200 border-green-600'}`}>
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>
        <Button
          onClick={() => changeFrame((state.currentFrameIndex - 1 + state.frames.length) % state.frames.length)}
          disabled={state.frames.length <= 1}
          className={`${buttonStyle} disabled:opacity-50 disabled:cursor-not-allowed`}
          title="Previous Frame"
        >
          <SkipBack className="w-4 h-4" />
        </Button>
        <Button
          onClick={() => changeFrame((state.currentFrameIndex + 1) % state.frames.length)}
          disabled={state.frames.length <= 1}
          className={`${buttonStyle} disabled:opacity-50 disabled:cursor-not-allowed`}
          title="Next Frame"
        >
          <SkipForward className="w-4 h-4" />
        </Button>
        {isLargeScreen && (
          <>
            <div className="flex items-center space-x-2 ml-4 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700">
              <Slider
                min={1} max={30} step={1} value={[fps]}
                onValueChange={value => setFps(value[0])}
                className="w-24"
              />
              <span className="text-xs font-medium text-slate-300 font-mono bg-slate-700 px-1.5 py-0.5 rounded min-w-[50px] text-center">
                {fps} FPS
              </span>
            </div>
            <div className="flex items-center gap-1.5 font-mono ml-4 bg-slate-800/30 px-2 py-1 rounded-lg border border-slate-700/50">
              <span className="flex items-center gap-1 text-red-400 text-xs">
                REC
                <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse"></div>
              </span>
              <span className="text-red-300 font-mono text-xs">
                00:{seconds.toString().padStart(2, '0')}.{frame.toString().padStart(2, '0')}
              </span>
            </div>
          </>
        )}
      </div>
      <div className="flex items-center space-x-2">
        {!isLargeScreen && (
          <div className="flex items-center gap-1 font-mono text-xs mr-2 bg-slate-800/30 px-1.5 py-0.5 rounded border border-slate-700/50">
            <span className="flex items-center gap-1 text-red-400 animate-pulse">
              REC
              <div className="h-1.5 w-1.5 bg-red-500 rounded-full animate-pulse"></div>
            </span>
            <span className="text-red-300">
              00:{seconds.toString().padStart(2, '0')}.{frame.toString().padStart(2, '0')}
            </span>
          </div>
        )}
        <Button 
          onClick={handleDownloadGif} 
          className={`${buttonStyle} bg-blue-700 hover:bg-blue-600 text-blue-200 border-blue-600`}
          disabled={isExporting}
        >
          {isExporting ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-200"></div>
          ) : (
            <Download className="w-4 h-4" />
          )}
        </Button>
        <div className="flex items-center gap-1.5 bg-slate-800/50 px-2 py-1 rounded-lg border border-slate-700">
          <Switch
            checked={showFrames}
            onCheckedChange={setShowFrames}
            className="data-[state=checked]:bg-slate-600"
          />
          <span className="text-xs hidden sm:inline text-slate-300 font-medium">Frames</span>
        </div>
      </div>
    </div>
  ), [addFrame, buttonStyle, isPlaying, setIsPlaying, changeFrame, state.currentFrameIndex, state.frames.length, isLargeScreen, fps, setFps, seconds, frame, handleDownloadGif, showFrames, setShowFrames, isExporting]);

  const renderFrameThumbnails = useMemo(() => (
    <div className="overflow-x-auto whitespace-nowrap mt-2 w-full pixel-scrollbar">
      <div className="flex gap-1.5 pb-1">
        {state.frames.map((frame, index) => (
          <FrameThumbnail
            key={index}
            frame={frame}
            index={index}
            state={state}
            updateState={updateState}
            onDelete={() => deleteFrame(index)}
            canDelete={state.frames.length > 1}
            onFrameSelect={handleFrameSelect}
          />
        ))}
      </div>
    </div>
  ), [state, updateState, deleteFrame, handleFrameSelect]);

  return (
    <div className="p-3 bg-slate-800/60 text-slate-200 backdrop-blur-sm border-t border-slate-700">
      {renderControls}
      {showFrames && renderFrameThumbnails}
    </div>
  );
});

AnimationControls.displayName = 'AnimationControls';

export default AnimationControls;