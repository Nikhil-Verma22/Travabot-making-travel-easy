import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface POI {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: string;
  type: 'attraction' | 'restaurant' | 'hotel';
  tags: string[];
  rating: number;
  image: string;
  priceLevel?: number;
  price?: number;
}

interface UsePOIsResult {
  attractions: POI[];
  restaurants: POI[];
  hotels: POI[];
  isLoading: boolean;
  error: string | null;
  isCached: boolean;
  refetch: () => void;
}

interface UsePOIsOptions {
  lat: number | null;
  lng: number | null;
  radius?: number;
  cityName?: string;
  includeHotels?: boolean;
}

export function usePOIs({
  lat,
  lng,
  radius = 15000,
  cityName,
  includeHotels = false,
}: UsePOIsOptions): UsePOIsResult {
  const [attractions, setAttractions] = useState<POI[]>([]);
  const [restaurants, setRestaurants] = useState<POI[]>([]);
  const [hotels, setHotels] = useState<POI[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);
  const [fetchTrigger, setFetchTrigger] = useState(0);

  useEffect(() => {
    if (!lat || !lng) {
      setAttractions([]);
      setRestaurants([]);
      setHotels([]);
      return;
    }

    const fetchPOIs = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const types = includeHotels 
          ? ['attraction', 'restaurant', 'hotel'] 
          : ['attraction', 'restaurant'];

        const { data, error: fetchError } = await supabase.functions.invoke('fetch-pois', {
          body: { lat, lng, radius, types, cityName },
        });

        if (fetchError) {
          throw new Error(fetchError.message);
        }

        const pois: POI[] = data?.pois || [];
        setIsCached(data?.cached || false);
        
        setAttractions(pois.filter((p) => p.type === 'attraction'));
        setRestaurants(pois.filter((p) => p.type === 'restaurant'));
        setHotels(pois.filter((p) => p.type === 'hotel'));
      } catch (err) {
        console.error('Error fetching POIs:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch places');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPOIs();
  }, [lat, lng, radius, cityName, includeHotels, fetchTrigger]);

  const refetch = useCallback(() => setFetchTrigger((prev) => prev + 1), []);

  return { attractions, restaurants, hotels, isLoading, error, isCached, refetch };
}

// Backward compatible export
export function usePOIsSimple(lat: number | null, lng: number | null, radius = 10000): Omit<UsePOIsResult, 'hotels' | 'isCached'> {
  const result = usePOIs({ lat, lng, radius });
  return {
    attractions: result.attractions,
    restaurants: result.restaurants,
    isLoading: result.isLoading,
    error: result.error,
    refetch: result.refetch,
  };
}