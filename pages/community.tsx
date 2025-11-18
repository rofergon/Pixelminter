import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, Images, ShieldCheck, Sparkles } from 'lucide-react';
import { useContractRead } from 'wagmi';
import { formatEther } from 'viem';
import { Button } from '@/components/ui/button';
import { pixelminterAbi } from '@/abi/pixelminterAbi';
import {
  PIXELMINTER_CHAIN_ID,
  PIXELMINTER_CONTRACT_ADDRESS,
  PIXELMINTER_ETHERSCAN_URL,
} from '@/constants/pixelminter';
import { usePixelminterGallery } from '@/hooks/usePixelminterGallery';
import { useGalleryFilters } from '@/hooks/useGalleryFilters';
import { ArtistSelectOption } from '@/components/ArtistSelectOption';
import GalleryTokenCard from '@/components/GalleryTokenCard';
import { AddressDisplay } from '@/components/AddressDisplay';

const CommunityPage = () => {
  const {
    tokens,
    totalSupply,
    hasLoadedSupply,
    isLoading,
    error,
  } = usePixelminterGallery({
    scope: 'global',
  });

  const {
    artistFilter,
    setArtistFilter,
    themeFilter,
    setThemeFilter,
    dayFilter,
    setDayFilter,
    artistOptions,
    themeOptions,
    dayOptions,
    filteredTokens,
    highlightedTokens,
    hasActiveFilters,
    shouldShowArtistFilter,
    clearFilters,
  } = useGalleryFilters(tokens, 'global');

  const { data: mintFeeData } = useContractRead({
    address: PIXELMINTER_CONTRACT_ADDRESS,
    abi: pixelminterAbi,
    functionName: 'getMintFee',
    chainId: PIXELMINTER_CHAIN_ID,
  });

  const mintFee = mintFeeData ? formatEther(mintFeeData as bigint) : null;
  const galleryStatTitle = 'Community pieces';
  const galleryStatDescription = 'Browse every animation minted from Pixelminter to see what the rest of the BasePaint community is producing.';
  const emptyGalleryMessage = hasActiveFilters
    ? 'No animations match your filters. Try a different artist, theme, or day.'
    : 'No animations have been minted on this contract yet. Check back soon to discover the latest pieces.';
  const hasTokens = tokens.length > 0;
  const showInitialSkeleton = isLoading && !hasTokens;
  const filterDescription = 'Refine this gallery by spotlighting artists, common themes, or the day it was created.';

  return (
    <>
      <Head>
        <title>Pixelminter | Community Gallery</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
        <div className="max-w-6xl mx-auto px-4 py-12 space-y-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="space-y-4 max-w-2xl">
              <p className="text-sm uppercase tracking-[0.35em] text-emerald-300">Pixelminter</p>
              <h1 className="text-4xl font-semibold">Community gallery</h1>
              <p className="text-slate-400">
                Explore every animation minted to Pixelminter in one place and get inspired by what the BasePaint
                community is sharing.
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
                  asChild
                  variant="ghost"
                  className="text-slate-100 border border-slate-800 hover:bg-slate-900/60"
                >
                  <Link href="/library">Your library</Link>
                </Button>
              </div>
            </div>
            <div className="w-full md:w-auto bg-slate-900/70 border border-slate-800 rounded-2xl p-4 shadow-pixel">
              <p className="text-xs uppercase text-slate-500 tracking-[0.3em]">Community feed</p>
              <p className="text-xl font-semibold mt-1">Global gallery</p>
              <p className="mt-2 text-xs text-slate-400">
                No wallet connection required to browse every mint from the Pixelminter contract.
              </p>
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
                Follow the growing catalog and watch every animation minted from Pixelminter.
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
              </div>
            </div>

            {error && (
              <div className="rounded-2xl border border-red-900/80 bg-red-950/60 p-4 text-red-200 text-sm">
                {error}
              </div>
            )}

            {!error && (
              <>
                {tokens.length > 0 && (
                  <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-4 space-y-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-slate-400">{filterDescription}</p>
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={clearFilters}
                          className="text-xs font-semibold text-emerald-300 hover:text-emerald-200"
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                    <div className={`grid gap-4 ${shouldShowArtistFilter ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
                      {shouldShowArtistFilter && (
                        <div className="space-y-1">
                          <label className="text-xs uppercase tracking-[0.3em] text-slate-500">Artist</label>
                          <select
                            value={artistFilter}
                            onChange={(event) => setArtistFilter(event.target.value)}
                            className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                          >
                            <option value="all">All artists</option>
                            {artistOptions.map((option) => (
                              <ArtistSelectOption key={option.value} value={option.value} label={option.label} />
                            ))}
                          </select>
                        </div>
                      )}
                      <div className="space-y-1">
                        <label className="text-xs uppercase tracking-[0.3em] text-slate-500">Theme</label>
                        <select
                          value={themeFilter}
                          onChange={(event) => setThemeFilter(event.target.value)}
                          className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                        >
                          <option value="all">All themes</option>
                          {themeOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs uppercase tracking-[0.3em] text-slate-500">Day</label>
                        <select
                          value={dayFilter}
                          onChange={(event) => setDayFilter(event.target.value)}
                          className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                        >
                          <option value="all">All days</option>
                          {dayOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {showInitialSkeleton && (
                  <div className="grid gap-5 sm:grid-cols-2">
                    {[1, 2].map((key) => (
                      <div
                        key={key}
                        className="animate-pulse rounded-2xl border border-slate-900 bg-slate-900/50 h-80"
                      />
                    ))}
                  </div>
                )}

                {!showInitialSkeleton && filteredTokens.length === 0 && (
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-center text-slate-400">
                    {emptyGalleryMessage}
                  </div>
                )}

                {!showInitialSkeleton && filteredTokens.length > 0 && (
                  <>
                    {highlightedTokens.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex flex-col gap-1">
                          <h3 className="text-xl font-semibold">Highlights</h3>
                          <p className="text-sm text-slate-400">
                            {hasActiveFilters
                              ? 'Picks that match your current filters.'
                              : 'A quick look at the freshest mints from this feed.'}
                          </p>
                        </div>
                        <div className="grid gap-6 md:grid-cols-3">
                          {highlightedTokens.map((token) => (
                            <GalleryTokenCard key={token.tokenId} token={token} isPersonalGallery={false} />
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="space-y-3">
                      <div className="flex flex-col gap-1">
                        <h3 className="text-xl font-semibold">Everything</h3>
                        <p className="text-sm text-slate-400">
                          {hasActiveFilters
                            ? 'Every animation that matches your current filters.'
                            : 'Browse the entire catalog sorted by newest token ID.'}
                        </p>
                      </div>
                      <div className="grid gap-6 sm:grid-cols-2">
                        {filteredTokens.map((token) => (
                          <GalleryTokenCard key={token.tokenId} token={token} isPersonalGallery={false} />
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </>
  );
};

export default CommunityPage;
