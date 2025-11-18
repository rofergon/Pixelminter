import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PixelminterGalleryScope, PixelminterToken } from '@/hooks/usePixelminterGallery';

export interface GalleryFilterOption {
  value: string;
  label: string;
}

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

export interface UseGalleryFiltersResult {
  artistFilter: string;
  setArtistFilter: (value: string) => void;
  artistOptions: GalleryFilterOption[];
  themeFilter: string;
  setThemeFilter: (value: string) => void;
  themeOptions: GalleryFilterOption[];
  dayFilter: string;
  setDayFilter: (value: string) => void;
  dayOptions: GalleryFilterOption[];
  filteredTokens: PixelminterToken[];
  highlightedTokens: PixelminterToken[];
  hasActiveFilters: boolean;
  shouldShowArtistFilter: boolean;
  clearFilters: () => void;
}

export const useGalleryFilters = (
  tokens: PixelminterToken[],
  scope: PixelminterGalleryScope
): UseGalleryFiltersResult => {
  const shouldShowArtistFilter = scope !== 'personal';
  const [artistFilter, setArtistFilter] = useState('all');
  const [themeFilter, setThemeFilter] = useState('all');
  const [dayFilter, setDayFilter] = useState('all');

  useEffect(() => {
    setArtistFilter('all');
    setThemeFilter('all');
    setDayFilter('all');
  }, [scope]);

  const { artistOptions, themeOptions, dayOptions } = useMemo(() => {
    const includeArtistOptions = shouldShowArtistFilter;
    const artistsMap = new Map<string, GalleryFilterOption>();
    const themesMap = new Map<string, GalleryFilterOption>();
    const daysMap = new Map<string, GalleryFilterOption>();

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

    const sortAlphabetically = (options: GalleryFilterOption[]) =>
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

  const highlightedTokens = filteredTokens.slice(0, Math.min(filteredTokens.length, 3));
  const hasActiveFilters = artistFilter !== 'all' || themeFilter !== 'all' || dayFilter !== 'all';

  const clearFilters = useCallback(() => {
    setArtistFilter('all');
    setThemeFilter('all');
    setDayFilter('all');
  }, []);

  return {
    artistFilter,
    setArtistFilter,
    artistOptions,
    themeFilter,
    setThemeFilter,
    themeOptions,
    dayFilter,
    setDayFilter,
    dayOptions,
    filteredTokens,
    highlightedTokens,
    hasActiveFilters,
    shouldShowArtistFilter,
    clearFilters,
  };
};
