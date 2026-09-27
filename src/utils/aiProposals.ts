import { promises as fs } from 'fs';
import path from 'path';

/** [x, y, paletteIndex] triplets, BasePaint canvas coordinates. */
export type PixelTriplets = Array<[number, number, number]>;

export interface AiAnimationFrame {
  /** Sprite pixels plus repairs that restore what the previous frame covered. */
  pixels: PixelTriplets;
  spritePixels: number;
  repairPixels: number;
}

// Written by the basepaint MCP server (mcp/basepaint) as `<id>.proposal.json`.
interface AiProposalBase {
  id: string;
  title: string | null;
  day: number;
  theme: string;
  size: number;
  palette: string[];
  stats: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AiStaticProposal extends AiProposalBase {
  kind?: 'static';
  pixels: PixelTriplets;
}

export interface AiAnimationProposal extends AiProposalBase {
  kind: 'animation';
  fps: number;
  repair: 'previous' | 'footprint';
  frames: AiAnimationFrame[];
}

export type AiProposal = AiStaticProposal | AiAnimationProposal;

export interface AiProposalSummary {
  id: string;
  title: string | null;
  day: number;
  theme: string;
  kind: 'static' | 'animation';
  pixelCount: number;
  frameCount: number;
  createdAt: string;
  updatedAt: string;
}

const SUFFIX = '.proposal.json';
const ID_PATTERN = /^[\w-]+$/;

export const getProposalsDir = (): string =>
  process.env.BASEPAINT_PROPOSALS_DIR ?? path.join(process.cwd(), 'mcp', 'basepaint', 'proposals');

export const isValidProposalId = (id: string): boolean => ID_PATTERN.test(id);

export const readProposal = async (id: string): Promise<AiProposal | null> => {
  if (!isValidProposalId(id)) return null;
  try {
    const raw = await fs.readFile(path.join(getProposalsDir(), `${id}${SUFFIX}`), 'utf8');
    return JSON.parse(raw) as AiProposal;
  } catch {
    return null;
  }
};

export const listProposals = async (): Promise<AiProposalSummary[]> => {
  let files: string[];
  try {
    files = await fs.readdir(getProposalsDir());
  } catch {
    return []; // No MCP proposals yet (or not running locally).
  }

  const proposals = await Promise.all(
    files
      .filter((file) => file.endsWith(SUFFIX))
      .map((file) => readProposal(file.slice(0, -SUFFIX.length)))
  );

  return proposals
    .filter((proposal): proposal is AiProposal => proposal !== null)
    .map((proposal): AiProposalSummary => ({
      id: proposal.id,
      title: proposal.title,
      day: proposal.day,
      theme: proposal.theme,
      kind: proposal.kind === 'animation' ? 'animation' : 'static',
      pixelCount:
        proposal.kind === 'animation'
          ? proposal.frames.reduce((sum, frame) => sum + frame.pixels.length, 0)
          : proposal.pixels.length,
      frameCount: proposal.kind === 'animation' ? proposal.frames.length : 1,
      createdAt: proposal.createdAt,
      updatedAt: proposal.updatedAt,
    }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
};
