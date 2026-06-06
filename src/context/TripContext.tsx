import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { POI } from '@/hooks/usePOIs';

export interface CityInfo {
  city: string;
  state: string | null;
  lat: number;
  lng: number;
  displayName?: string;
}

export interface TripDetails {
  id?: string;
  source: CityInfo;
  destination: CityInfo;
  startDate: Date;
  endDate: Date;
  travelers: number;
}

interface TransportOption {
  id: number;
  name: string;
  type: 'Flight' | 'Train' | 'Bus' | 'Car';
  departureTime: string;
  arrivalTime: string;
  duration: string;
  price: number;
  details: string;
}

interface CachedData {
  attractions: POI[];
  restaurants: POI[];
  hotels: POI[];
  arrivalTransport: TransportOption[];
  returnTransport: TransportOption[];
  lastFetched: number;
  tripHash: string; // Hash of trip details to detect changes
}

interface TripContextType {
  trip: TripDetails | null;
  setTrip: (trip: TripDetails) => void;
  updateTrip: (updates: Partial<TripDetails>) => void;
  clearTrip: () => void;
  isConfigured: boolean;
  duration: number;
  
  // Cached data management
  cachedData: CachedData | null;
  setCachedData: (data: Partial<CachedData>) => void;
  clearCache: () => void;
  isCacheValid: () => boolean;
  getTripHash: () => string;
}

const TripContext = createContext<TripContextType | undefined>(undefined);

const STORAGE_KEY = 'travabot_trip';
const CACHE_KEY = 'travabot_cache';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// Generate hash from trip details to detect changes
function generateTripHash(trip: TripDetails | null): string {
  if (!trip) return '';
  return btoa(JSON.stringify({
    source: trip.source,
    destination: trip.destination,
    startDate: trip.startDate.toISOString(),
    endDate: trip.endDate.toISOString(),
    travelers: trip.travelers
  }));
}

export function TripProvider({ children }: { children: ReactNode }) {
  const [trip, setTripState] = useState<TripDetails | null>(null);
  const [cachedData, setCachedDataState] = useState<CachedData | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    // Load trip data
    const storedTrip = localStorage.getItem(STORAGE_KEY);
    if (storedTrip) {
      try {
        const parsed = JSON.parse(storedTrip);
        // Convert date strings back to Date objects
        if (parsed.startDate) parsed.startDate = new Date(parsed.startDate);
        if (parsed.endDate) parsed.endDate = new Date(parsed.endDate);
        setTripState(parsed);
      } catch (e) {
        console.error('Failed to parse stored trip:', e);
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    // Load cached data
    const storedCache = localStorage.getItem(CACHE_KEY);
    if (storedCache) {
      try {
        const parsed = JSON.parse(storedCache);
        setCachedDataState(parsed);
      } catch (e) {
        console.error('Failed to parse stored cache:', e);
        localStorage.removeItem(CACHE_KEY);
      }
    }
  }, []);

  // Persist trip to localStorage whenever it changes
  useEffect(() => {
    if (trip) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trip));
    }
  }, [trip]);

  // Persist cache to localStorage whenever it changes
  useEffect(() => {
    if (cachedData) {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cachedData));
    }
  }, [cachedData]);

  const setTrip = (newTrip: TripDetails) => {
    const newHash = generateTripHash(newTrip);
    const currentHash = cachedData?.tripHash;
    
    // Clear cache if trip details changed significantly
    if (currentHash && newHash !== currentHash) {
      console.log('🗑️ Clearing cache due to trip change');
      clearCache();
    }
    
    setTripState(newTrip);
  };

  const updateTrip = (updates: Partial<TripDetails>) => {
    setTripState(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      
      const newHash = generateTripHash(updated);
      const currentHash = cachedData?.tripHash;
      
      // Clear cache if trip details changed significantly
      if (currentHash && newHash !== currentHash) {
        console.log('🗑️ Clearing cache due to trip update');
        clearCache();
      }
      
      return updated;
    });
  };

  const clearTrip = () => {
    setTripState(null);
    clearCache();
    localStorage.removeItem(STORAGE_KEY);
  };

  const setCachedData = (data: Partial<CachedData>) => {
    setCachedDataState(prev => ({
      attractions: [],
      restaurants: [],
      hotels: [],
      arrivalTransport: [],
      returnTransport: [],
      lastFetched: Date.now(),
      tripHash: generateTripHash(trip),
      ...prev,
      ...data,
    }));
  };

  const clearCache = () => {
    setCachedDataState(null);
    localStorage.removeItem(CACHE_KEY);
  };

  const isCacheValid = (): boolean => {
    if (!cachedData || !trip) return false;
    
    const now = Date.now();
    const isExpired = (now - cachedData.lastFetched) > CACHE_DURATION;
    const hashChanged = cachedData.tripHash !== generateTripHash(trip);
    
    return !isExpired && !hashChanged;
  };

  const getTripHash = (): string => {
    return generateTripHash(trip);
  };

  const isConfigured = Boolean(
    trip?.source?.city && 
    trip?.destination?.city && 
    trip?.startDate && 
    trip?.endDate
  );

  const duration = trip?.startDate && trip?.endDate
    ? Math.ceil((trip.endDate.getTime() - trip.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
    : 0;

  return (
    <TripContext.Provider value={{ 
      trip, 
      setTrip, 
      updateTrip, 
      clearTrip, 
      isConfigured,
      duration,
      cachedData,
      setCachedData,
      clearCache,
      isCacheValid,
      getTripHash
    }}>
      {children}
    </TripContext.Provider>
  );
}

export function useTrip() {
  const context = useContext(TripContext);
  if (context === undefined) {
    throw new Error('useTrip must be used within a TripProvider');
  }
  return context;
}
