import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Activity {
  time: string;
  type: 'transport' | 'hotel' | 'attraction' | 'restaurant' | 'shopping' | 'activity';
  title: string;
  description: string;
  location: string;
}

export interface ItineraryDay {
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

// Generate fallback itinerary
function generateFallbackItinerary(params: GenerateItineraryParams): ItineraryDay[] {
  const { destinationCity, startDate, endDate, selectedAttractions, selectedRestaurants, selectedHotel, transportType } = params;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  const itinerary: ItineraryDay[] = [];
  
  for (let i = 0; i < days; i++) {
    const currentDate = new Date(start);
    currentDate.setDate(start.getDate() + i);
    const dateStr = currentDate.toISOString().split('T')[0];
    
    const activities: Activity[] = [];
    
    if (i === 0) {
      // First day - arrival
      activities.push({
        time: '09:00',
        type: 'transport',
        title: `Arrive in ${destinationCity}`,
        description: `Travel to ${destinationCity} by ${transportType}`,
        location: destinationCity,
      });
      
      if (selectedHotel) {
        activities.push({
          time: '12:00',
          type: 'hotel',
          title: 'Check-in at Hotel',
          description: `Check-in at ${selectedHotel.name}`,
          location: selectedHotel.name,
        });
      }
      
      activities.push({
        time: '14:00',
        type: 'restaurant',
        title: 'Lunch',
        description: selectedRestaurants[0] ? `Enjoy local cuisine at ${selectedRestaurants[0].name}` : 'Enjoy local cuisine',
        location: selectedRestaurants[0]?.name || 'Local Restaurant',
      });
      
      if (selectedAttractions[0]) {
        activities.push({
          time: '16:00',
          type: 'attraction',
          title: `Visit ${selectedAttractions[0].name}`,
          description: `Explore ${selectedAttractions[0].name}`,
          location: selectedAttractions[0].name,
        });
      }
      
      activities.push({
        time: '19:00',
        type: 'restaurant',
        title: 'Dinner',
        description: selectedRestaurants[1] ? `Dinner at ${selectedRestaurants[1].name}` : 'Dinner at local restaurant',
        location: selectedRestaurants[1]?.name || 'Local Restaurant',
      });
      
    } else if (i === days - 1) {
      // Last day - departure
      activities.push({
        time: '08:00',
        type: 'restaurant',
        title: 'Breakfast',
        description: 'Breakfast at hotel',
        location: selectedHotel?.name || 'Hotel',
      });
      
      if (selectedHotel) {
        activities.push({
          time: '10:00',
          type: 'hotel',
          title: 'Check-out',
          description: `Check-out from ${selectedHotel.name}`,
          location: selectedHotel.name,
        });
      }
      
      if (selectedAttractions[i % selectedAttractions.length]) {
        activities.push({
          time: '11:00',
          type: 'attraction',
          title: `Visit ${selectedAttractions[i % selectedAttractions.length].name}`,
          description: `Quick visit to ${selectedAttractions[i % selectedAttractions.length].name}`,
          location: selectedAttractions[i % selectedAttractions.length].name,
        });
      }
      
      activities.push({
        time: '14:00',
        type: 'transport',
        title: `Depart from ${destinationCity}`,
        description: `Return journey by ${transportType}`,
        location: destinationCity,
      });
      
    } else {
      // Middle days - full exploration
      activities.push({
        time: '08:00',
        type: 'restaurant',
        title: 'Breakfast',
        description: 'Breakfast at hotel',
        location: selectedHotel?.name || 'Hotel',
      });
      
      const attraction1 = selectedAttractions[(i * 2) % selectedAttractions.length];
      if (attraction1) {
        activities.push({
          time: '09:30',
          type: 'attraction',
          title: `Visit ${attraction1.name}`,
          description: `Explore ${attraction1.name}`,
          location: attraction1.name,
        });
      }
      
      activities.push({
        time: '13:00',
        type: 'restaurant',
        title: 'Lunch',
        description: selectedRestaurants[i % selectedRestaurants.length] ? `Lunch at ${selectedRestaurants[i % selectedRestaurants.length].name}` : 'Lunch at local restaurant',
        location: selectedRestaurants[i % selectedRestaurants.length]?.name || 'Local Restaurant',
      });
      
      const attraction2 = selectedAttractions[(i * 2 + 1) % selectedAttractions.length];
      if (attraction2) {
        activities.push({
          time: '15:00',
          type: 'attraction',
          title: `Visit ${attraction2.name}`,
          description: `Explore ${attraction2.name}`,
          location: attraction2.name,
        });
      }
      
      activities.push({
        time: '18:00',
        type: 'shopping',
        title: 'Shopping & Leisure',
        description: `Explore local markets in ${destinationCity}`,
        location: `${destinationCity} Market`,
      });
      
      activities.push({
        time: '20:00',
        type: 'restaurant',
        title: 'Dinner',
        description: selectedRestaurants[(i + 1) % selectedRestaurants.length] ? `Dinner at ${selectedRestaurants[(i + 1) % selectedRestaurants.length].name}` : 'Dinner at local restaurant',
        location: selectedRestaurants[(i + 1) % selectedRestaurants.length]?.name || 'Local Restaurant',
      });
    }
    
    itinerary.push({
      day: i + 1,
      date: dateStr,
      title: i === 0 ? `Arrival in ${destinationCity}` : i === days - 1 ? `Departure from ${destinationCity}` : `Exploring ${destinationCity}`,
      activities,
    });
  }
  
  return itinerary;
}

export function useItinerary() {
  const [days, setDays] = useState<ItineraryDay[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateItinerary = async (params: GenerateItineraryParams) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('🔄 Generating AI itinerary for', params.destinationCity);

      // Try edge function first
      const { data, error: fetchError } = await supabase.functions.invoke('generate-itinerary', {
        body: params,
      });

      if (fetchError) throw fetchError;

      const generatedDays: ItineraryDay[] = data?.days || [];
      
      // If edge function returns results, use them
      if (generatedDays.length > 0) {
        console.log(`✅ Generated ${generatedDays.length}-day AI itinerary`);
        setDays(generatedDays);
        return generatedDays;
      } else {
        throw new Error('No itinerary returned');
      }
    } catch (err) {
      // Fallback to template-based itinerary
      console.warn('Edge function failed, using fallback itinerary:', err);
      const fallbackDays = generateFallbackItinerary(params);
      setDays(fallbackDays);
      setError(null); // Don't show error to user, fallback worked
      console.log(`✅ Generated ${fallbackDays.length}-day fallback itinerary`);
      return fallbackDays;
    } finally {
      setIsLoading(false);
    }
  };

  return { days, isLoading, error, generateItinerary, setDays };
}
