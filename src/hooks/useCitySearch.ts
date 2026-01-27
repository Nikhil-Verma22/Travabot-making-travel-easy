import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CitySearchResult {
  city: string;
  state: string | null;
  displayName: string;
  lat: number;
  lng: number;
}

// Simple in-memory cache for search results
const searchCache = new Map<string, { results: CitySearchResult[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function useCitySearch() {
  const [results, setResults] = useState<CitySearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const searchCities = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    const normalizedQuery = query.toLowerCase().trim();
    
    // Check cache first
    const cached = searchCache.get(normalizedQuery);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setResults(cached.results);
      return;
    }

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('search-cities', {
        body: { query: normalizedQuery, limit: 5 },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      const searchResults = data?.results || [];
      
      // Cache the results
      searchCache.set(normalizedQuery, { results: searchResults, timestamp: Date.now() });
      
      setResults(searchResults);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Ignore aborted requests
      }
      console.error('City search error:', err);
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const geocodeCity = useCallback(async (city: string): Promise<CitySearchResult | null> => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('geocode-city', {
        body: { city },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      return data;
    } catch (err) {
      console.error('Geocode error:', err);
      return null;
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return {
    results,
    isLoading,
    error,
    searchCities,
    geocodeCity,
    clearResults,
  };
}
