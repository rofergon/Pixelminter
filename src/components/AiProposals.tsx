import React, { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Frame, Layer, State } from '@/types/types';
import { calculateDay } from '@/hooks/useDateUtils';
import type { AiProposal, AiProposalSummary, PixelTriplets } from '@/utils/aiProposals';

interface AiProposalsProps {
  state: State;
  updateState: (_newState: Partial<State> | ((_prevState: State) => Partial<State>)) => void;
  handleExtractPalette: () => void | Promise<void>;
}

const LAYER_PREFIX = 'AI: ';

const upsertLayer = (frame: Frame, layer: Layer): Frame => ({
  ...frame,
  layers: frame.layers.some((existing) => existing.id === layer.id)
    ? frame.layers.map((existing) => (existing.id === layer.id ? layer : existing))
    : [...frame.layers, layer],
});

const samePalette = (a: string[], b: string[]) =>
  a.length === b.length && a.every((color, i) => color.toLowerCase() === b[i]?.toLowerCase());

const timeAgo = (iso: string) => {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `${hours}h ago` : `${Math.round(hours / 24)}d ago`;
};

/**
 * Lists pixel-art proposals written by the basepaint MCP server and loads one
 * as a new layer over today's canvas, so it can be reviewed, tweaked and
 * committed with the regular "Commit To Basepaint" flow.
 */
const AiProposals: React.FC<AiProposalsProps> = ({ state, updateState, handleExtractPalette }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [proposals, setProposals] = useState<AiProposalSummary[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: 'info' | 'warn' | 'error'; text: string } | null>(null);

  const refresh = useCallback(async () => {
    setIsFetching(true);
    try {
      const response = await fetch('/api/proposals');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data: { proposals: AiProposalSummary[] } = await response.json();
      setProposals(data.proposals);
    } catch (error) {
      setMessage({ kind: 'error', text: `Could not list proposals: ${(error as Error).message}` });
    } finally {
      setIsFetching(false);
    }
  }, []);

  const loadProposal = useCallback(async (id: string) => {
    setLoadingId(id);
    setMessage(null);
    try {
      const response = await fetch(`/api/proposals/${encodeURIComponent(id)}`);
      if (!response.ok) throw new Error(response.status === 404 ? 'proposal not found' : `HTTP ${response.status}`);
      const proposal: AiProposal = await response.json();

      const today = await calculateDay();
      if (proposal.day !== today) {
        throw new Error(`it was made for day ${proposal.day}, but today is day ${today}. BasePaint only accepts today's canvas.`);
      }
      const themeResponse = await fetch(`/api/theme/${today}`);
      if (!themeResponse.ok) throw new Error(`could not load today's palette (HTTP ${themeResponse.status})`);
      const theme: { palette: string[] } = await themeResponse.json();
      if (!samePalette(theme.palette, proposal.palette)) {
        throw new Error('the proposal palette does not match today\'s palette.');
      }

      // Proposal coordinates are BasePaint canvas pixels: needs today's palette and the 256 grid.
      if (!samePalette(state.palette, theme.palette) || state.gridSize !== proposal.size) {
        await handleExtractPalette();
      }

      // Use the exact color strings the editor palette holds so encodePixelData can index them.
      const toPixelMap = (triplets: PixelTriplets) => {
        const pixels = new Map<string, string>();
        triplets.forEach(([x, y, colorIndex]) => {
          const color = theme.palette[colorIndex];
          if (color) pixels.set(`${x},${y}`, color);
        });
        return pixels;
      };
      // Stable id: loading the same proposal again replaces its layer instead of stacking copies.
      const layerId = `ai-${proposal.id}`;
      const name = `${LAYER_PREFIX}${proposal.title ?? proposal.id}`;
      const makeLayer = (pixels: Map<string, string>): Layer => ({ id: layerId, name, pixels, visible: true, opacity: 1 });

      const othersWithPixels = (state.frames[state.currentFrameIndex]?.layers ?? []).filter(
        (layer) => layer.id !== layerId && layer.visible && layer.pixels.size > 0
      ).length;
      const othersNote = othersWithPixels
        ? ` ${othersWithPixels} other visible layer(s) also have pixels and would be committed/minted too.`
        : '';

      if (proposal.kind === 'animation') {
        const frameLayers = proposal.frames.map((frame) => toPixelMap(frame.pixels));
        updateState((prev) => {
          const frames = [...prev.frames];
          frameLayers.forEach((pixels, k) => {
            // New frames copy the other layers of the last existing frame, like "add frame" does.
            const base: Frame = frames[k] ?? {
              layers: frames[frames.length - 1].layers
                .filter((layer) => layer.id !== layerId)
                .map((layer) => ({ ...layer, pixels: new Map(layer.pixels) })),
              history: [],
              historyIndex: -1,
            };
            frames[k] = upsertLayer(base, makeLayer(pixels));
          });
          // A shorter revision of the same animation: drop its layer from the extra frames.
          for (let k = frameLayers.length; k < frames.length; k++) {
            const layers = frames[k].layers.filter((layer) => layer.id !== layerId);
            if (layers.length) frames[k] = { ...frames[k], layers };
          }
          return { frames, activeLayerId: layerId, currentFrameIndex: 0, fps: proposal.fps, showBackgroundImage: true };
        });
        setMessage({
          kind: othersWithPixels ? 'warn' : 'info',
          text:
            `Loaded ${frameLayers.length} frames @ ${proposal.fps} fps as layer "${name}". ` +
            'Press play to review, mint the GIF with Pixelminter, or commit frame by frame to BasePaint in order ' +
            '(each frame repairs what the previous one covered).' +
            othersNote,
        });
      } else {
        const pixels = toPixelMap(proposal.pixels);
        updateState((prev) => ({
          activeLayerId: layerId,
          showBackgroundImage: true,
          frames: prev.frames.map((frame, index) =>
            index === prev.currentFrameIndex ? upsertLayer(frame, makeLayer(pixels)) : frame
          ),
        }));
        setMessage({
          kind: othersWithPixels ? 'warn' : 'info',
          text:
            `Loaded ${pixels.size} px as layer "${name}".` +
            (othersNote || ' Review it over the canvas, then use Commit To Basepaint.'),
        });
      }
    } catch (error) {
      setMessage({ kind: 'error', text: `Could not load proposal: ${(error as Error).message}` });
    } finally {
      setLoadingId(null);
    }
  }, [state.palette, state.gridSize, state.frames, state.currentFrameIndex, handleExtractPalette, updateState]);

  const hideOtherLayers = useCallback(() => {
    updateState((prev) => ({
      frames: prev.frames.map((frame) => ({
        ...frame,
        layers: frame.layers.map((layer) => ({ ...layer, visible: layer.id === prev.activeLayerId })),
      })),
    }));
    setMessage({ kind: 'info', text: 'Only the proposal layer is visible now (in every frame), so only it will be committed or minted.' });
  }, [updateState]);

  useEffect(() => {
    if (isOpen) refresh();
  }, [isOpen, refresh]);

  // Links from the MCP server look like /?proposal=<id>: open the panel and load it once.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('proposal');
    if (!id) return;
    params.delete('proposal');
    const query = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
    setIsOpen(true);
    loadProposal(id);
    // Run once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="tool-container rounded-lg shadow-md overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-2.5 flex justify-between items-center text-left hover:bg-slate-700/30 transition-all duration-200 rounded-t-lg"
      >
        <h3 className="text-xs font-medium flex items-center text-slate-300">
          <Sparkles className="mr-1" size={14} />AI Proposals
        </h3>
        {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {isOpen && (
        <div className="px-2.5 pb-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">From the basepaint MCP server</p>
            <button
              onClick={refresh}
              disabled={isFetching}
              className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-50"
              aria-label="Refresh proposals"
            >
              <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} />
            </button>
          </div>

          {message && (
            <div
              className={`text-xs p-2 rounded border ${
                message.kind === 'error'
                  ? 'bg-red-900/30 border-red-700 text-red-300'
                  : message.kind === 'warn'
                    ? 'bg-amber-900/30 border-amber-700 text-amber-200'
                    : 'bg-slate-800/60 border-slate-600 text-slate-300'
              }`}
            >
              {message.text}
              {message.kind === 'warn' && (
                <button onClick={hideOtherLayers} className="block mt-1 underline text-amber-300 hover:text-amber-200">
                  Hide other layers
                </button>
              )}
            </div>
          )}

          {!isFetching && proposals.length === 0 && (
            <p className="text-xs text-slate-500">
              No proposals yet. Ask Claude to preview one with basepaint_preview_proposal.
            </p>
          )}

          <ul className="space-y-1.5 max-h-64 overflow-y-auto pixel-scrollbar">
            {proposals.map((proposal) => {
              const expired = Boolean(state.day && proposal.day !== state.day);
              return (
                <li
                  key={proposal.id}
                  className="flex items-center gap-2 p-2 bg-slate-800/50 rounded-lg border border-slate-700"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-200 truncate" title={proposal.id}>
                      {proposal.title ?? proposal.id}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      Day {proposal.day} · {proposal.kind === 'animation' ? `${proposal.frameCount} frames · ` : ''}
                      {proposal.pixelCount} px · {timeAgo(proposal.updatedAt)}
                      {expired && <span className="ml-1 text-red-400">expired</span>}
                    </p>
                  </div>
                  <Button
                    onClick={() => loadProposal(proposal.id)}
                    disabled={expired || loadingId !== null}
                    className="h-7 px-2 text-xs bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-50"
                  >
                    {loadingId === proposal.id ? 'Loading…' : 'Load'}
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AiProposals;
