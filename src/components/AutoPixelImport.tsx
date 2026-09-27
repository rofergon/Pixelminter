import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, ImagePlus, RotateCcw, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Frame, Layer, State } from '@/types/types';
import {
  detectPixelGrid,
  fitGrid,
  GridDetection,
  removeBackground,
  reduceColors,
  RgbaImage,
  samplePixelGrid,
  toHex,
  toPixelMap,
  trimTransparent,
} from '@/utils/pixelGridDetect';

interface AutoPixelImportProps {
  state: State;
  updateState: (_newState: Partial<State> | ((_prevState: State) => Partial<State>)) => void;
  onGridSizeChange: (_newSize: number) => void;
}

interface Source {
  id: string;
  name: string;
  image: RgbaImage;
  canvas: HTMLCanvasElement;
}

// Bigger images are downscaled before analysis; detection cost grows with width x height.
const MAX_SOURCE = 2048;
const MIN_PERIOD = 2;
const PREVIEW = 256;
// GIFs (Pixelminter mints) hold up to 256 colors; fewer keeps the art clean.
const DEFAULT_MAX_COLORS = 32;

const loadSource = (blob: Blob, name: string): Promise<Source> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const ratio = Math.min(1, MAX_SOURCE / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return reject(new Error('canvas 2D context unavailable'));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      resolve({ id: `${Date.now().toString(36)}`, name, image: { data, width, height }, canvas });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('the file is not a readable image'));
    };
    img.src = url;
  });

const upsertLayer = (frame: Frame, layer: Layer): Frame => ({
  ...frame,
  layers: frame.layers.some((existing) => existing.id === layer.id)
    ? frame.layers.map((existing) => (existing.id === layer.id ? layer : existing))
    : [...frame.layers, layer],
});

const drawChecker = (ctx: CanvasRenderingContext2D, w: number, h: number, size = 8) => {
  for (let y = 0; y < h; y += size) {
    for (let x = 0; x < w; x += size) {
      ctx.fillStyle = (x / size + y / size) % 2 ? '#334155' : '#1e293b';
      ctx.fillRect(x, y, size, size);
    }
  }
};

/**
 * Turns upscaled pixel art (e.g. AI generated, blurry or compressed) back into
 * 1:1 pixels: detects the logical pixel size, samples one color per cell and
 * adds the result to the canvas as its own layer.
 */
const AutoPixelImport: React.FC<AutoPixelImportProps> = ({ state, updateState, onGridSizeChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [source, setSource] = useState<Source | null>(null);
  const [detected, setDetected] = useState<GridDetection | null>(null);
  const [period, setPeriod] = useState<number | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [removeBg, setRemoveBg] = useState(true);
  const [trim, setTrim] = useState(true);
  const [matchPalette, setMatchPalette] = useState(true);
  const [maxColors, setMaxColors] = useState(DEFAULT_MAX_COLORS);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const [message, setMessage] = useState<{ kind: 'info' | 'error'; text: string } | null>(null);
  const originalRef = useRef<HTMLCanvasElement>(null);
  const resultRef = useRef<HTMLCanvasElement>(null);

  const hasPalette = state.palette.length > 0;
  const usePalette = hasPalette && matchPalette;

  const handleBlob = useCallback(async (blob: Blob, name: string) => {
    setIsBusy(true);
    setMessage(null);
    try {
      const loaded = await loadSource(blob, name);
      // Let the "Analyzing…" state paint before the synchronous detection runs.
      await new Promise((resolve) => setTimeout(resolve, 0));
      const grid = detectPixelGrid(loaded.image, { minPeriod: MIN_PERIOD });
      setSource(loaded);
      setDetected(grid);
      setPeriod(grid?.period ?? null);
      setPosition(null);
      if (!grid) setMessage({ kind: 'error', text: 'No pixel grid found: the image looks flat.' });
    } catch (error) {
      setMessage({ kind: 'error', text: `Could not read the image: ${(error as Error).message}` });
    } finally {
      setIsBusy(false);
    }
  }, []);

  const grid = useMemo(() => {
    if (!source || period === null) return null;
    return detected && Math.abs(period - detected.period) < 1e-6 ? detected : fitGrid(source.image, period);
  }, [source, detected, period]);

  const result = useMemo(() => {
    if (!source || !grid) return null;
    let image = samplePixelGrid(source.image, grid);
    if (removeBg) image = removeBackground(image);
    if (trim) image = trimTransparent(image);
    // Palette matching already limits the colors.
    if (!usePalette) image = reduceColors(image, maxColors);
    return image;
  }, [source, grid, removeBg, trim, usePalette, maxColors]);

  const placement = useMemo(() => {
    if (!result) return null;
    return position ?? {
      left: Math.floor((state.gridSize - result.width) / 2),
      top: Math.floor((state.gridSize - result.height) / 2),
    };
  }, [result, position, state.gridSize]);

  // Original image with the detected grid on top, to check the fit by eye.
  useEffect(() => {
    const canvas = originalRef.current;
    if (!canvas || !source) return;
    const scale = Math.min(1, PREVIEW * 2 / Math.max(source.image.width, source.image.height));
    canvas.width = Math.round(source.image.width * scale);
    canvas.height = Math.round(source.image.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawChecker(ctx, canvas.width, canvas.height);
    ctx.drawImage(source.canvas, 0, 0, canvas.width, canvas.height);
    if (!grid || grid.period * scale < 3) return;
    ctx.strokeStyle = 'rgba(236, 72, 153, 0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = grid.offsetX % grid.period; x <= source.image.width; x += grid.period) {
      ctx.moveTo(Math.round(x * scale) + 0.5, 0);
      ctx.lineTo(Math.round(x * scale) + 0.5, canvas.height);
    }
    for (let y = grid.offsetY % grid.period; y <= source.image.height; y += grid.period) {
      ctx.moveTo(0, Math.round(y * scale) + 0.5);
      ctx.lineTo(canvas.width, Math.round(y * scale) + 0.5);
    }
    ctx.stroke();
  }, [source, grid, isOpen]);

  // The result placed on the editor grid, so clipping and position are visible.
  useEffect(() => {
    const canvas = resultRef.current;
    if (!canvas || !result || !placement) return;
    const cell = Math.max(1, Math.floor(PREVIEW / state.gridSize));
    canvas.width = canvas.height = cell * state.gridSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawChecker(ctx, canvas.width, canvas.height, Math.max(cell * 4, 8));
    const pixels = toPixelMap(result, { ...placement, gridSize: state.gridSize, palette: usePalette ? state.palette : undefined });
    pixels.forEach((color, key) => {
      const [x, y] = key.split(',').map(Number);
      ctx.fillStyle = color;
      ctx.fillRect(x * cell, y * cell, cell, cell);
    });
  }, [result, placement, state.gridSize, state.palette, usePalette, isOpen]);

  // Paste an image from the clipboard while the panel is open.
  useEffect(() => {
    if (!isOpen) return;
    const onPaste = (event: ClipboardEvent) => {
      const item = Array.from(event.clipboardData?.items ?? []).find((i) => i.type.startsWith('image/'));
      const file = item?.getAsFile();
      if (file) handleBlob(file, 'pasted image');
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [isOpen, handleBlob]);

  const layerId = source ? `img-${source.id}` : null;
  const layerExists = Boolean(
    layerId && state.frames[state.currentFrameIndex]?.layers.some((layer) => layer.id === layerId)
  );

  const addToCanvas = () => {
    if (!result || !placement || !source || !layerId) return;
    const pixels = toPixelMap(result, {
      ...placement,
      gridSize: state.gridSize,
      palette: usePalette ? state.palette : undefined,
    });
    // Stable id per source image: adding again after tweaking replaces the layer instead of stacking copies.
    const layer: Layer = { id: layerId, name: `Image: ${source.name}`, pixels, visible: true, opacity: 1 };
    updateState((prev) => ({
      activeLayerId: layerId,
      frames: prev.frames.map((frame, index) => (index === prev.currentFrameIndex ? upsertLayer(frame, layer) : frame)),
    }));
    const colors = new Set(pixels.values()).size;
    setMessage({
      kind: 'info',
      text: `${layerExists ? 'Updated' : 'Added'} layer "${layer.name}": ${pixels.size} px, ${colors} colors.`,
    });
  };

  const fitsGrid = !result || (result.width <= state.gridSize && result.height <= state.gridSize);
  const neededGrid = result ? Math.min(256, Math.ceil(Math.max(result.width, result.height) / 8) * 8) : state.gridSize;
  const maxPeriod = source ? Math.max(MIN_PERIOD + 1, Math.min(source.image.width, source.image.height) / 4) : 64;

  const setOffset = (axis: 'left' | 'top', value: number) => {
    if (!placement || Number.isNaN(value)) return;
    setPosition({ ...placement, [axis]: Math.round(value) });
  };

  return (
    <div className="tool-container rounded-lg shadow-md overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-2.5 flex justify-between items-center text-left hover:bg-slate-700/30 transition-all duration-200 rounded-t-lg"
      >
        <h3 className="text-xs font-medium flex items-center text-slate-300">
          <Wand2 className="mr-1" size={14} />Auto Paint Image
        </h3>
        {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {isOpen && (
        <div className="px-2.5 pb-2.5 space-y-2">
          <p className="text-xs text-slate-400">
            Upload or paste (Ctrl+V) upscaled pixel art. The real pixel size is detected and each pixel is painted 1:1.
          </p>

          <input
            type="file"
            accept="image/*"
            id="auto-pixel-upload"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) handleBlob(file, file.name.replace(/\.[^.]+$/, ''));
              event.target.value = '';
            }}
          />
          <label
            htmlFor="auto-pixel-upload"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const file = event.dataTransfer.files?.[0];
              if (file) handleBlob(file, file.name.replace(/\.[^.]+$/, ''));
            }}
            className="h-10 w-full border border-dashed border-slate-600 hover:border-slate-400 text-slate-300 text-xs flex items-center justify-center rounded-lg cursor-pointer transition-colors"
          >
            <ImagePlus className="mr-1" size={14} />
            {isBusy ? 'Analyzing…' : source ? 'Choose another image' : 'Choose, drop or paste an image'}
          </label>

          {message && (
            <div
              className={`text-xs p-2 rounded border ${
                message.kind === 'error'
                  ? 'bg-red-900/30 border-red-700 text-red-300'
                  : 'bg-slate-800/60 border-slate-600 text-slate-300'
              }`}
            >
              {message.text}
            </div>
          )}

          {source && grid && result && placement && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[10px] text-slate-500 mb-1">Detected grid</p>
                  <canvas ref={originalRef} className="w-full rounded border border-slate-700" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 mb-1">On canvas ({state.gridSize}×{state.gridSize})</p>
                  <canvas
                    ref={resultRef}
                    className="w-full rounded border border-slate-700"
                    style={{ imageRendering: 'pixelated' }}
                  />
                </div>
              </div>

              <div className="p-2 bg-slate-800/50 rounded-lg border border-slate-700 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>Pixel size</span>
                  <span className="font-mono">
                    {grid.period.toFixed(2)}px → {result.width}×{result.height}
                  </span>
                </div>
                <Slider
                  min={MIN_PERIOD}
                  max={maxPeriod}
                  step={0.01}
                  value={[grid.period]}
                  onValueChange={(value) => {
                    setPeriod(value[0]);
                    setPosition(null);
                  }}
                  className="w-full"
                />
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span>Fit: {Math.round(grid.confidence * 100)}%</span>
                  {detected && Math.abs(grid.period - detected.period) > 1e-6 && (
                    <button
                      onClick={() => {
                        setPeriod(detected.period);
                        setPosition(null);
                      }}
                      className="flex items-center gap-1 text-slate-400 hover:text-slate-200"
                    >
                      <RotateCcw size={10} />Auto ({detected.period.toFixed(2)}px)
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center justify-between text-xs text-slate-300">
                  Remove background
                  <Switch checked={removeBg} onCheckedChange={setRemoveBg} />
                </label>
                <label className="flex items-center justify-between text-xs text-slate-300">
                  Trim empty borders
                  <Switch checked={trim} onCheckedChange={setTrim} />
                </label>
                <label className="flex items-center justify-between text-xs text-slate-300">
                  <span>
                    Match today&apos;s palette
                    {!hasPalette && <span className="block text-[10px] text-slate-500">Load the palette to use it</span>}
                  </span>
                  <Switch checked={usePalette} disabled={!hasPalette} onCheckedChange={setMatchPalette} />
                </label>
                {hasPalette && !usePalette && (
                  <p className="text-[10px] text-amber-300">
                    Colors outside the palette are skipped by Commit To Basepaint.
                  </p>
                )}
                {!usePalette && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <span>Max colors</span>
                      <span className="font-mono">{maxColors}</span>
                    </div>
                    <Slider
                      min={2}
                      max={256}
                      step={1}
                      value={[maxColors]}
                      onValueChange={(value) => setMaxColors(value[0])}
                      className="w-full"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-300">
                <span>X</span>
                <input
                  type="number"
                  value={placement.left}
                  onChange={(event) => setOffset('left', event.target.valueAsNumber)}
                  className="w-14 bg-slate-700 rounded px-1 py-0.5 font-mono"
                  aria-label="Left position"
                />
                <span>Y</span>
                <input
                  type="number"
                  value={placement.top}
                  onChange={(event) => setOffset('top', event.target.valueAsNumber)}
                  className="w-14 bg-slate-700 rounded px-1 py-0.5 font-mono"
                  aria-label="Top position"
                />
                <button onClick={() => setPosition(null)} className="ml-auto text-slate-400 hover:text-slate-200">
                  Center
                </button>
              </div>

              {!fitsGrid && (
                <div className="text-xs p-2 rounded border bg-amber-900/30 border-amber-700 text-amber-200">
                  {result.width}×{result.height} does not fit the {state.gridSize}×{state.gridSize} grid and will be clipped.
                  {neededGrid > state.gridSize && (
                    <button
                      onClick={() => {
                        onGridSizeChange(neededGrid);
                        setPosition(null);
                      }}
                      className="block mt-1 underline text-amber-300 hover:text-amber-200"
                    >
                      Resize grid to {neededGrid}×{neededGrid}
                    </button>
                  )}
                </div>
              )}

              <Button
                onClick={addToCanvas}
                className="h-8 w-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold"
              >
                {layerExists ? 'Update layer' : 'Add to canvas as layer'}
              </Button>
              <p className="text-[10px] text-slate-500 truncate" title={source.name}>
                {source.name} · {source.image.width}×{source.image.height}
                {!usePalette && ` · ${new Set(result.cells.filter(Boolean).map((c) => toHex(c!))).size} colors`}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AutoPixelImport;
