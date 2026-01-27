import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

interface UseTransportOptions {
  sourceCity: string;
  sourceState: string | null;
  destinationCity: string;
  destinationState: string | null;
  date: string;
  travelers: number;
}

export function useTransport({ sourceCity, sourceState, destinationCity, destinationState, date, travelers }: UseTransportOptions) {
  const [options, setOptions] = useState<TransportOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sourceCity || !destinationCity || !date) return;

    const fetchTransport = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: fnError } = await supabase.functions.invoke('generate-transport', {
          body: {
            sourceCity,
            sourceState,
            destinationCity,
            destinationState,
            date,
            travelers
          }
        });

        if (fnError) {
          throw fnError;
        }

        if (data.error) {
          throw new Error(data.error);
        }

        setOptions(data.options || []);
      } catch (err) {
        console.error('Error fetching transport options:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch transport options');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransport();
  }, [sourceCity, sourceState, destinationCity, destinationState, date, travelers]);

  return { options, isLoading, error };
}
