/* eslint-disable no-unused-vars */
import { useEffect, useRef, useState, useCallback } from 'react';
import { State, Frame } from '../../types/types';

export function useAnimationControl(
  state: State,
  fps: number,
  updateState: (newState: Partial<State> | ((prevState: State) => Partial<State>)) => void,
  updateCanvasDisplay: (() => void) | undefined
) {
  const [isPlaying, setIsPlaying] = useState(false);
  const animationRef = useRef<number | null>(null);

  const safeUpdateCanvasDisplay = useCallback(() => {
    if (typeof updateCanvasDisplay === 'function') {
      updateCanvasDisplay();
    } else {
      console.warn('updateCanvasDisplay is not a function');
    }
  }, [updateCanvasDisplay]);

  const changeFrame = useCallback((newIndex: number) => {
    updateState(prevState => ({
      currentFrameIndex: newIndex,
    }));
    safeUpdateCanvasDisplay();
  }, [updateState, safeUpdateCanvasDisplay]);

  useEffect(() => {
    if (isPlaying && state.frames.length > 1) {
      animationRef.current = window.setInterval(() => {
        updateState(prevState => ({
          currentFrameIndex: (prevState.currentFrameIndex + 1) % prevState.frames.length,
        }));
        safeUpdateCanvasDisplay();
      }, 1000 / fps);
    }
    return () => {
      if (animationRef.current !== null) {
        clearInterval(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isPlaying, fps, state.frames.length, updateState, safeUpdateCanvasDisplay]);

  return {
    isPlaying,
    setIsPlaying,
    changeFrame,
  };
}