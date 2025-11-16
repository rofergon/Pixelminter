import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import type { PixelminterGalleryScope, PixelminterToken } from '@/hooks/usePixelminterGallery';
import { AddressDisplay } from '@/components/AddressDisplay';
import { useAddressName } from '@/hooks/useAddressName';

const featuredTraits = ['Theme', 'FPS', 'Frame Count', 'Total Pixels', 'Creation Date', 'Author'];
const ARTIST_AUTHOR_PREFIX = 'author|';
const ARTIST_OWNER_PREFIX = 'owner|';

const getTraitValue = (token: PixelminterToken, traitType: string) => {
  return token.metadata?.attributes?.find((attr) =>
    attr.trait_type?.toLowerCase() === traitType.toLowerCase()
  )?.value;
};

const getTraitValueText = (token: PixelminterToken, traitType: string) => {
  const traitValue = getTraitValue(token, traitType);
  if (typeof traitValue === 'string') {
    return traitValue;
  }
  if (typeof traitValue === 'number') {
    return traitValue.toString();
  }
  return undefined;
};

const toFilterKey = (value?: string) => value?.trim().toLowerCase() ?? '';

const LibraryPage = () => {
  const { address } = useAccount();
  const scopeHasBeenSetManually = useRef(false);
  const [galleryScope, setGalleryScope] = useState<PixelminterGalleryScope>(address ? 'personal' : 'global');
  const isPersonalGallery = galleryScope === 'personal';
  const shouldShowArtistFilter = !isPersonalGallery;
  const [artistFilter, setArtistFilter] = useState('all');
  const [themeFilter, setThemeFilter] = useState('all');
  const [dayFilter, setDayFilter] = useState('all');

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

  useEffect(() => {
    setArtistFilter('all');
    setThemeFilter('all');
    setDayFilter('all');
  }, [galleryScope]);

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
  } = usePixelminterGallery({
    owner: address,
    scope: galleryScope,
  });

  const { artistOptions, themeOptions, dayOptions } = useMemo(() => {
    const includeArtistOptions = shouldShowArtistFilter;
    const artistsMap = new Map<string, { value: string; label: string }>();
    const themesMap = new Map<string, { value: string; label: string }>();
    const daysMap = new Map<string, { value: string; label: string }>();

    tokens.forEach((token) => {
      if (includeArtistOptions) {
        const author = getTraitValueText(token, 'Author');
        if (author) {
          const normalized = toFilterKey(author);
          if (normalized) {
            const key = `${ARTIST_AUTHOR_PREFIX}${normalized}`;
            if (!artistsMap.has(key)) {
              artistsMap.set(key, { value: key, label: author });
            }
          }
        } else if (token.owner) {
          const ownerKey = `${ARTIST_OWNER_PREFIX}${token.owner.toLowerCase()}`;
          if (!artistsMap.has(ownerKey)) {
            // Store full address in label - will be resolved to ENS/Basename in UI
            artistsMap.set(ownerKey, { value: ownerKey, label: token.owner });
          }
        }
      }

      const theme = getTraitValueText(token, 'Theme');
      if (theme) {
        const normalizedTheme = toFilterKey(theme);
        if (normalizedTheme && !themesMap.has(normalizedTheme)) {
          themesMap.set(normalizedTheme, { value: normalizedTheme, label: theme });
        }
      }

      const dayNumber = getTraitValueText(token, 'Day');
      if (dayNumber) {
        const normalizedDay = toFilterKey(dayNumber);
        if (normalizedDay && !daysMap.has(normalizedDay)) {
          daysMap.set(normalizedDay, { value: normalizedDay, label: dayNumber });
        }
      }
    });

    const sortAlphabetically = (options: { value: string; label: string }[]) =>
      options.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));

    return {
      artistOptions: includeArtistOptions ? sortAlphabetically(Array.from(artistsMap.values())) : [],
      themeOptions: sortAlphabetically(Array.from(themesMap.values())),
      dayOptions: sortAlphabetically(Array.from(daysMap.values())),
    };
  }, [tokens, shouldShowArtistFilter]);

  useEffect(() => {
    if (!shouldShowArtistFilter) {
      if (artistFilter !== 'all') {
        setArtistFilter('all');
      }
      return;
    }

    if (artistFilter !== 'all' && !artistOptions.some((option) => option.value === artistFilter)) {
      setArtistFilter('all');
    }
  }, [artistFilter, artistOptions, shouldShowArtistFilter]);

  useEffect(() => {
    if (themeFilter !== 'all' && !themeOptions.some((option) => option.value === themeFilter)) {
      setThemeFilter('all');
    }
  }, [themeFilter, themeOptions]);

  useEffect(() => {
    if (dayFilter !== 'all' && !dayOptions.some((option) => option.value === dayFilter)) {
      setDayFilter('all');
    }
  }, [dayFilter, dayOptions]);

  const filteredTokens = useMemo(() => {
    if (!tokens.length) {
      return [];
    }

    return tokens.filter((token) => {
      const matchesArtist =
        !shouldShowArtistFilter ||
        artistFilter === 'all' ||
        (() => {
          if (artistFilter.startsWith(ARTIST_AUTHOR_PREFIX)) {
            const target = artistFilter.slice(ARTIST_AUTHOR_PREFIX.length);
            const author = getTraitValueText(token, 'Author');
            return author ? toFilterKey(author) === target : false;
          }

          if (artistFilter.startsWith(ARTIST_OWNER_PREFIX)) {
            const target = artistFilter.slice(ARTIST_OWNER_PREFIX.length);
            return token.owner ? token.owner.toLowerCase() === target : false;
          }

          return false;
        })();

      if (!matchesArtist) {
        return false;
      }

      const matchesTheme =
        themeFilter === 'all' ||
        (() => {
          const theme = getTraitValueText(token, 'Theme');
          return theme ? toFilterKey(theme) === themeFilter : false;
        })();

      if (!matchesTheme) {
        return false;
      }

      const matchesDay =
        dayFilter === 'all' ||
        (() => {
          const dayNumber = getTraitValueText(token, 'Day');
          return dayNumber ? toFilterKey(dayNumber) === dayFilter : false;
        })();

      return matchesDay;
    });
  }, [tokens, artistFilter, themeFilter, dayFilter, shouldShowArtistFilter]);

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
  const highlightedTokens = filteredTokens.slice(0, Math.min(filteredTokens.length, 3));
  const hasActiveFilters = artistFilter !== 'all' || themeFilter !== 'all' || dayFilter !== 'all';
  const emptyGalleryMessage = hasActiveFilters
    ? shouldShowArtistFilter
      ? 'No animations match your filters. Try a different artist, theme, or day.'
      : 'No animations match your filters. Try a different theme or day.'
    : isPersonalGallery
      ? 'You haven’t minted any animations on this contract yet. Go back to the canvas and mint your first piece to see it here.'
      : 'No animations have been minted on this contract yet. Check back soon to discover the latest pieces.';
  const hasTokens = tokens.length > 0;
  const showInitialSkeleton = isLoading && !hasTokens;
  const filterDescription = shouldShowArtistFilter
    ? 'Refine this gallery by spotlighting artists, common themes, or the day it was created.'
    : 'Refine this gallery by spotlighting common themes or the day it was created.';

  const clearFilters = () => {
    setArtistFilter('all');
    setThemeFilter('all');
    setDayFilter('all');
  };

  // Helper to check if a string is an Ethereum address
  const isAddress = (value: string | number): boolean => {
    if (typeof value !== 'string') return false;
    return /^0x[a-fA-F0-9]{40}$/.test(value);
  };

  // Helper component to resolve address to display name for select options
  const useResolvedArtistLabel = (label: string): string => {
    const { displayName } = useAddressName(isAddress(label) ? label : null);
    return isAddress(label) ? displayName : label;
  };

  // Component wrapper for artist select option
  const ArtistSelectOption = ({ value, label }: { value: string; label: string }) => {
    const resolvedLabel = useResolvedArtistLabel(label);
    return (
      <option value={value}>
        {resolvedLabel}
      </option>
    );
  };

  // Component to render trait value with address resolution for Author field
  const TraitValue = ({ traitType, value }: { traitType: string; value: string | number | undefined }) => {
    if (!value) return <>—</>;
    if (traitType === 'Author' && isAddress(value)) {
      return <AddressDisplay address={value as string} />;
    }
    return <>{value}</>;
  };

  const renderTokenCard = (token: PixelminterToken) => {
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
                <span className="font-mono text-slate-200"><AddressDisplay address={PIXELMINTER_CONTRACT_ADDRESS} /></span> and
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
              </div>
            </div>
            <div className="w-full md:w-auto bg-slate-900/70 border border-slate-800 rounded-2xl p-4 shadow-pixel">
              <p className="text-xs uppercase text-slate-500 tracking-[0.3em]">Wallet</p>
              <p className="text-xl font-semibold mt-1">
                <AddressDisplay address={address} />
              </p>
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

            {canShowGallery && error && (
              <div className="rounded-2xl border border-red-900/80 bg-red-950/60 p-4 text-red-200 text-sm">
                {error}
              </div>
            )}

            {canShowGallery && !error && (
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
                          <h3 className="text-xl font-semibold">Lo más destacado</h3>
                          <p className="text-sm text-slate-400">
                            {hasActiveFilters
                              ? 'Picks that match your current filters.'
                              : 'A quick look at the freshest mints from this feed.'}
                          </p>
                        </div>
                        <div className="grid gap-6 md:grid-cols-3">
                          {highlightedTokens.map((token) => renderTokenCard(token))}
                        </div>
                      </div>
                    )}
                    <div className="space-y-3">
                      <div className="flex flex-col gap-1">
                        <h3 className="text-xl font-semibold">Todo</h3>
                        <p className="text-sm text-slate-400">
                          {hasActiveFilters
                            ? 'Every animation that matches your current filters.'
                            : 'Browse the entire catalog sorted by newest token ID.'}
                        </p>
                      </div>
                      <div className="grid gap-6 sm:grid-cols-2">
                        {filteredTokens.map((token) => renderTokenCard(token))}
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

export default LibraryPage;
