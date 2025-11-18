import { ExternalLink, RefreshCw } from 'lucide-react';
import { AddressDisplay } from '@/components/AddressDisplay';
import type { PixelminterToken } from '@/hooks/usePixelminterGallery';

const featuredTraits = ['Theme', 'FPS', 'Frame Count', 'Total Pixels', 'Creation Date', 'Author'];

const isAddress = (value: string | number): boolean => {
  if (typeof value !== 'string') {
    return false;
  }
  return /^0x[a-fA-F0-9]{40}$/.test(value);
};

const TraitValue = ({ traitType, value }: { traitType: string; value: string | number | undefined }) => {
  if (!value) {
    return <>—</>;
  }

  if (traitType === 'Author' && isAddress(value)) {
    return <AddressDisplay address={value as string} />;
  }

  return <>{value}</>;
};

interface GalleryTokenCardProps {
  token: PixelminterToken;
  isPersonalGallery: boolean;
}

const GalleryTokenCard = ({ token, isPersonalGallery }: GalleryTokenCardProps) => {
  const traits =
    token.metadata?.attributes?.filter((attr) =>
      attr.trait_type ? featuredTraits.includes(attr.trait_type) : false
    ) ?? [];

  return (
    <div className="rounded-3xl border border-slate-900 bg-slate-900/60 overflow-hidden shadow-pixel flex flex-col">
      <div className="bg-slate-950/80 p-4 border-b border-slate-900">
        <p className="text-xs text-slate-500 uppercase tracking-[0.35em]">Token #{token.tokenId}</p>
        <p className="text-xl font-semibold mt-1">
          {token.metadata?.name ?? `Pixelminter #${token.tokenId}`}
        </p>
        {!isPersonalGallery && token.owner && (
          <p className="text-xs text-slate-500 mt-2">
            Owned by <span className="font-mono text-slate-200"><AddressDisplay address={token.owner} /></span>
          </p>
        )}
      </div>
      <div className="aspect-square bg-slate-950 flex items-center justify-center border-b border-slate-900">
        {token.animationUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={token.animationUrl}
            alt={token.metadata?.name ?? `Token ${token.tokenId}`}
            className="max-h-full max-w-full object-contain"
            loading="lazy"
          />
        ) : (
          <div className="relative h-full w-full overflow-hidden rounded-xl border border-slate-900 bg-slate-900">
            <div className="absolute inset-0 animate-pulse bg-[length:200%_200%] bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900" />
            <div className="relative z-10 flex h-full flex-col items-center justify-center px-4 text-center text-xs text-slate-400">
              <RefreshCw className="mb-2 h-4 w-4 animate-spin text-emerald-300" />
              Loading preview…
            </div>
          </div>
        )}
      </div>
      <div className="p-4 space-y-4 flex-1 flex flex-col">
        <p className="text-sm text-slate-400">
          {token.metadata?.description ?? 'This animation was minted from Pixelminter.'}
        </p>
        {traits.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {traits.map((trait) => (
              <span
                key={`${token.tokenId}-${trait.trait_type}`}
                className="text-xs px-2 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-200"
              >
                <span className="text-slate-500">{trait.trait_type}:</span>{' '}
                <span className="font-semibold">
                  <TraitValue traitType={trait.trait_type || ''} value={trait.value} />
                </span>
              </span>
            ))}
          </div>
        )}
        <div className="mt-auto flex flex-wrap gap-2">
          {token.animationUrl && (
            <a
              href={token.animationUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-300 hover:text-emerald-200"
            >
              View animation
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default GalleryTokenCard;
