import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Activity {
  time: string;
  type: 'transport' | 'hotel' | 'attraction' | 'restaurant' | 'shopping' | 'activity';
  title: string;
  description: string;
  location: string;
}

interface ItineraryDay {
  day: number;
  date: string;
  title: string;
  activities: Activity[];
}

interface GenerateItineraryParams {
  destinationCity: string;
  destinationState: string | null;
  destinationLat?: number;
  destinationLng?: number;
  startDate: string;
  endDate: string;
  travelers: number;
  selectedAttractions: Array<{ name: string; lat?: number; lng?: number }>;
  selectedRestaurants: Array<{ name: string; lat?: number; lng?: number }>;
  selectedHotel: { name: string; lat?: number; lng?: number } | null;
  transportType: string;
}

export function useItinerary() {
  const [days, setDays] = useState<ItineraryDay[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateItinerary = async (params: GenerateItineraryParams) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-itinerary', {
        body: params
      });

      if (fnError) {
        throw fnError;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setDays(data.days || []);
      return data.days;
    } catch (err) {
      console.error('Error generating itinerary:', err);
      const message = err instanceof Error ? err.message : 'Failed to generate itinerary';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { days, isLoading, error, generateItinerary, setDays };
}
