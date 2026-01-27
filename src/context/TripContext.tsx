import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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

interface TripContextType {
  trip: TripDetails | null;
  setTrip: (trip: TripDetails) => void;
  updateTrip: (updates: Partial<TripDetails>) => void;
  clearTrip: () => void;
  isConfigured: boolean;
  duration: number;
}

const TripContext = createContext<TripContextType | undefined>(undefined);

const STORAGE_KEY = 'travabot_trip';

export function TripProvider({ children }: { children: ReactNode }) {
  const [trip, setTripState] = useState<TripDetails | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Convert date strings back to Date objects
        if (parsed.startDate) parsed.startDate = new Date(parsed.startDate);
        if (parsed.endDate) parsed.endDate = new Date(parsed.endDate);
        setTripState(parsed);
      } catch (e) {
        console.error('Failed to parse stored trip:', e);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Persist to localStorage whenever trip changes
  useEffect(() => {
    if (trip) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trip));
    }
  }, [trip]);

  const setTrip = (newTrip: TripDetails) => {
    setTripState(newTrip);
  };

  const updateTrip = (updates: Partial<TripDetails>) => {
    setTripState(prev => prev ? { ...prev, ...updates } : null);
  };

  const clearTrip = () => {
    setTripState(null);
    localStorage.removeItem(STORAGE_KEY);
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
      duration
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
