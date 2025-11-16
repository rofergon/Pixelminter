import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ExternalLink, Images, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import { useAccount, useContractRead } from 'wagmi';
import { formatEther } from 'viem';
import { Button } from '@/components/ui/button';
import { pixelminterAbi } from '@/abi/pixelminterAbi';
import {
  PIXELMINTER_CHAIN_ID,
  PIXELMINTER_CONTRACT_ADDRESS,
  PIXELMINTER_ETHERSCAN_URL,
} from '@/constants/pixelminter';
import { usePixelminterGallery } from '@/hooks/usePixelminterGallery';
import type { PixelminterGalleryScope } from '@/hooks/usePixelminterGallery';

const shortenAddress = (value?: string | null) => {
  if (!value) return '—';
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
};

const featuredTraits = ['Theme', 'FPS', 'Frame Count', 'Total Pixels', 'Creation Date', 'Author'];

const LibraryPage = () => {
  const { address } = useAccount();
  const scopeHasBeenSetManually = useRef(false);
  const [galleryScope, setGalleryScope] = useState<PixelminterGalleryScope>(address ? 'personal' : 'global');
  const isPersonalGallery = galleryScope === 'personal';

  useEffect(() => {
    if (!address && galleryScope === 'personal') {
      scopeHasBeenSetManually.current = false;
      setGalleryScope('global');
    }
  }, [address, galleryScope]);

  useEffect(() => {
    if (address && !scopeHasBeenSetManually.current) {
      setGalleryScope('personal');
    }
  }, [address]);

  const handleGalleryScopeChange = (scope: PixelminterGalleryScope) => {
    if (scope === 'personal' && !address) return;
    scopeHasBeenSetManually.current = true;
    setGalleryScope(scope);
  };

  const {
    tokens,
    totalSupply,
    hasLoadedSupply,
    isLoading,
    error,
    refresh,
  } = usePixelminterGallery({
    owner: address,
    scope: galleryScope,
  });

  const { data: mintFeeData } = useContractRead({
    address: PIXELMINTER_CONTRACT_ADDRESS,
    abi: pixelminterAbi,
    functionName: 'getMintFee',
    chainId: PIXELMINTER_CHAIN_ID,
  });

  const mintFee = mintFeeData ? formatEther(mintFeeData as bigint) : null;
  const canShowGallery = isPersonalGallery ? Boolean(address) : true;
  const galleryStatTitle = isPersonalGallery ? 'Your pieces' : 'Community pieces';
  const galleryStatDescription = isPersonalGallery
    ? 'The list is built by calling ownerOf() + tokenURI() for each token and validating that the owner is your current wallet.'
    : 'Browse every animation minted from Pixelminter to see what the rest of the BasePaint community is producing.';

  return (
    <>
      <Head>
        <title>Pixelminter | NFT Library</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
        <div className="max-w-6xl mx-auto px-4 py-12 space-y-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="space-y-4 max-w-2xl">
              <p className="text-sm uppercase tracking-[0.35em] text-emerald-300">Pixelminter</p>
              <h1 className="text-4xl font-semibold">Your BasePaint animation library</h1>
              <p className="text-slate-400">
                Explore the GIFs you minted directly to the contract{' '}
                <span className="font-mono text-slate-200">{shortenAddress(PIXELMINTER_CONTRACT_ADDRESS)}</span> and
                verify that each token points to assets hosted on Lighthouse.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button
                  asChild
                  variant="secondary"
                  className="bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-100"
                >
                  <Link href="/">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to canvas
                  </Link>
                </Button>
                <Button
                  onClick={refresh}
                  disabled={isLoading}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh gallery
                </Button>
              </div>
            </div>
            <div className="w-full md:w-auto bg-slate-900/70 border border-slate-800 rounded-2xl p-4 shadow-pixel">
              <p className="text-xs uppercase text-slate-500 tracking-[0.3em]">Wallet</p>
              <p className="text-xl font-semibold mt-1">{shortenAddress(address)}</p>
              <div className="mt-4 flex justify-end">
                <appkit-button balance="hide" />
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 shadow-pixel">
              <div className="flex items-center gap-3">
                <ShieldCheck className="text-emerald-400" />
                <div>
                  <p className="text-xs uppercase text-slate-500">Verified contract</p>
                  <p className="text-sm font-semibold text-slate-200">PixelminterNFT</p>
                </div>
              </div>
              <p className="mt-3 text-xs font-mono break-all text-slate-400">{PIXELMINTER_CONTRACT_ADDRESS}</p>
              <div className="mt-4 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
                <span className={mintFee === '0' || mintFee === '0.0' || !mintFee ? 'text-emerald-300 font-semibold' : ''}>
                  {mintFee && mintFee !== '0' && mintFee !== '0.0' ? `Current mint fee: ${mintFee} ETH` : 'Minting is FREE! 🎉'}
                </span>
                <a
                  href={PIXELMINTER_ETHERSCAN_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-emerald-300 hover:text-emerald-200"
                >
                  View on Basescan
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 shadow-pixel">
              <div className="flex items-center gap-3">
                <Images className="text-indigo-400" />
                <div>
                  <p className="text-xs uppercase text-slate-500">Total supply</p>
                  <p className="text-2xl font-bold">
                    {hasLoadedSupply ? totalSupply : '—'}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-400">
                Start collecting your own animated WIPs and build your unique pixel art gallery.
              </p>
            </div>
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 shadow-pixel">
              <div className="flex items-center gap-3">
                <Sparkles className="text-amber-300" />
                <div>
                  <p className="text-xs uppercase text-slate-500">{galleryStatTitle}</p>
                  <p className="text-2xl font-bold">{tokens.length}</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-400">{galleryStatDescription}</p>
            </div>
          </div>

          <section className="bg-slate-950/60 border border-slate-900 rounded-3xl p-6 shadow-neon space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Gallery</h2>
                <p className="text-sm text-slate-400">
                  Each preview uses the <code className="font-mono text-slate-200">animation_url</code> or{' '}
                  <code className="font-mono text-slate-200">image</code> pointing to the official Lighthouse gateway.
                </p>
              </div>
              <div className="flex flex-col gap-2 text-sm text-slate-400">
                <span className="text-xs uppercase tracking-[0.35em] text-slate-500 text-right md:text-left">
                  View
                </span>
                <div className="inline-flex rounded-full border border-slate-800 bg-slate-900/70 p-1">
                  <button
                    type="button"
                    onClick={() => handleGalleryScopeChange('personal')}
                    disabled={!address}
                    aria-pressed={isPersonalGallery}
                    className={`px-4 py-2 text-xs font-semibold rounded-full transition ${
                      isPersonalGallery
                        ? 'bg-indigo-600 text-white shadow-neon'
                        : 'text-slate-400 hover:text-slate-100'
                    } ${!address ? 'cursor-not-allowed opacity-40' : ''}`}
                  >
                    Personal
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGalleryScopeChange('global')}
                    aria-pressed={!isPersonalGallery}
                    className={`px-4 py-2 text-xs font-semibold rounded-full transition ${
                      !isPersonalGallery
                        ? 'bg-indigo-600 text-white shadow-neon'
                        : 'text-slate-400 hover:text-slate-100'
                    }`}
                  >
                    Community
                  </button>
                </div>
              </div>
            </div>

            {!canShowGallery && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-center text-slate-400">
                Connect your wallet to see the NFTs you have minted.
              </div>
            )}

            {error && (
              <div className="rounded-2xl border border-red-900/80 bg-red-950/60 p-4 text-red-200 text-sm">
                {error}
              </div>
            )}

            {canShowGallery && !error && (
              <>
                {isLoading && (
                  <div className="grid gap-5 sm:grid-cols-2">
                    {[1, 2].map((key) => (
                      <div
                        key={key}
                        className="animate-pulse rounded-2xl border border-slate-900 bg-slate-900/50 h-80"
                      />
                    ))}
                  </div>
                )}

                {!isLoading && tokens.length === 0 && (
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-center text-slate-400">
                    {isPersonalGallery
                      ? 'You haven’t minted any animations on this contract yet. Go back to the canvas and mint your first piece to see it here.'
                      : 'No animations have been minted on this contract yet. Check back soon to discover the latest pieces.'}
                  </div>
                )}

                {!isLoading && tokens.length > 0 && (
                  <div className="grid gap-6 sm:grid-cols-2">
                    {tokens.map((token) => {
                      const traits =
                        token.metadata?.attributes?.filter((attr) =>
                          attr.trait_type ? featuredTraits.includes(attr.trait_type) : false
                        ) ?? [];

                      return (
                        <div
                          key={token.tokenId}
                          className="rounded-3xl border border-slate-900 bg-slate-900/60 overflow-hidden shadow-pixel flex flex-col"
                        >
                          <div className="bg-slate-950/80 p-4 border-b border-slate-900">
                            <p className="text-xs text-slate-500 uppercase tracking-[0.35em]">Token #{token.tokenId}</p>
                            <h3 className="text-xl font-semibold mt-1">
                              {token.metadata?.name ?? `Pixelminter #${token.tokenId}`}
                            </h3>
                            {!isPersonalGallery && token.owner && (
                              <p className="text-xs text-slate-500 mt-2">
                                Owned by <span className="font-mono text-slate-200">{shortenAddress(token.owner)}</span>
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
                              <div className="text-slate-600 text-sm">No preview available</div>
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
                                    <span className="font-semibold">{trait.value}</span>
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
                    })}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </>
  );
};

export default LibraryPage;
