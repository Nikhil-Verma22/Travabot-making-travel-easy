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

// Comprehensive local POI database for major Indian cities (fallback)
const LOCAL_POIS: Record<string, { attractions: POI[]; restaurants: POI[]; hotels: POI[] }> = {
  'jaipur': {
    attractions: [
      { id: 'jp-1', name: 'Hawa Mahal', lat: 26.9239, lng: 75.8267, category: 'Palace', type: 'attraction', tags: ['historical', 'architecture'], rating: 4.5, image: 'https://images.unsplash.com/photo-1599661046289-e31897846e41' },
      { id: 'jp-2', name: 'Amber Fort', lat: 26.9855, lng: 75.8513, category: 'Fort', type: 'attraction', tags: ['historical', 'unesco'], rating: 4.7, image: 'https://images.unsplash.com/photo-1477587458883-47145ed94245' },
      { id: 'jp-3', name: 'City Palace', lat: 26.9258, lng: 75.8237, category: 'Palace', type: 'attraction', tags: ['historical', 'museum'], rating: 4.6, image: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da' },
      { id: 'jp-4', name: 'Jantar Mantar', lat: 26.9247, lng: 75.8249, category: 'Observatory', type: 'attraction', tags: ['historical', 'unesco', 'science'], rating: 4.4, image: 'https://images.unsplash.com/photo-1598970434795-0c54fe7c0648' },
      { id: 'jp-5', name: 'Jal Mahal', lat: 26.9539, lng: 75.8461, category: 'Palace', type: 'attraction', tags: ['historical', 'lake'], rating: 4.3, image: 'https://images.unsplash.com/photo-1599661046827-dacff0c0f09a' },
    ],
    restaurants: [
      { id: 'jp-r1', name: 'Chokhi Dhani', lat: 26.7850, lng: 75.8550, category: 'Rajasthani', type: 'restaurant', tags: ['traditional', 'cultural'], rating: 4.5, image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe', priceLevel: 2 },
      { id: 'jp-r2', name: 'Rawat Mishtan Bhandar', lat: 26.9124, lng: 75.7873, category: 'Sweets', type: 'restaurant', tags: ['local', 'sweets'], rating: 4.6, image: 'https://images.unsplash.com/photo-1606471191009-63d2e1e7e0f0', priceLevel: 1 },
      { id: 'jp-r3', name: 'Laxmi Mishthan Bhandar', lat: 26.9196, lng: 75.7878, category: 'Rajasthani', type: 'restaurant', tags: ['traditional', 'sweets'], rating: 4.4, image: 'https://images.unsplash.com/photo-1596797038530-2c107229654b', priceLevel: 1 },
      { id: 'jp-r4', name: 'Peacock Rooftop Restaurant', lat: 26.9258, lng: 75.8237, category: 'Multi-cuisine', type: 'restaurant', tags: ['rooftop', 'view'], rating: 4.3, image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4', priceLevel: 3 },
    ],
    hotels: [
      { id: 'jp-h1', name: 'Taj Rambagh Palace', lat: 26.8983, lng: 75.8123, category: 'Luxury', type: 'hotel', tags: ['5-star', 'heritage'], rating: 4.8, image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945', price: 25000 },
      { id: 'jp-h2', name: 'Alsisar Haveli', lat: 26.9196, lng: 75.8078, category: 'Heritage', type: 'hotel', tags: ['heritage', 'traditional'], rating: 4.5, image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb', price: 8000 },
    ],
  },
  'mumbai': {
    attractions: [
      { id: 'mb-1', name: 'Gateway of India', lat: 18.9220, lng: 72.8347, category: 'Monument', type: 'attraction', tags: ['historical', 'landmark'], rating: 4.5, image: 'https://images.unsplash.com/photo-1566552881560-0be862a7c445' },
      { id: 'mb-2', name: 'Marine Drive', lat: 18.9432, lng: 72.8236, category: 'Promenade', type: 'attraction', tags: ['scenic', 'beach'], rating: 4.6, image: 'https://images.unsplash.com/photo-1595658658481-d53d3f999875' },
      { id: 'mb-3', name: 'Elephanta Caves', lat: 18.9633, lng: 72.9315, category: 'Caves', type: 'attraction', tags: ['unesco', 'historical'], rating: 4.4, image: 'https://images.unsplash.com/photo-1609137144813-7d9921338f24' },
      { id: 'mb-4', name: 'Chhatrapati Shivaji Terminus', lat: 18.9398, lng: 72.8355, category: 'Railway Station', type: 'attraction', tags: ['unesco', 'architecture'], rating: 4.5, image: 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f' },
    ],
    restaurants: [
      { id: 'mb-r1', name: 'Leopold Cafe', lat: 18.9220, lng: 72.8310, category: 'Multi-cuisine', type: 'restaurant', tags: ['iconic', 'historic'], rating: 4.2, image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4', priceLevel: 2 },
      { id: 'mb-r2', name: 'Britannia & Co', lat: 18.9568, lng: 72.8320, category: 'Parsi', type: 'restaurant', tags: ['heritage', 'parsi'], rating: 4.4, image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1', priceLevel: 2 },
    ],
    hotels: [
      { id: 'mb-h1', name: 'Taj Mahal Palace', lat: 18.9216, lng: 72.8332, category: 'Luxury', type: 'hotel', tags: ['5-star', 'iconic'], rating: 4.8, image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945', price: 30000 },
    ],
  },
  'delhi': {
    attractions: [
      { id: 'dl-1', name: 'Red Fort', lat: 28.6562, lng: 77.2410, category: 'Fort', type: 'attraction', tags: ['unesco', 'historical'], rating: 4.5, image: 'https://images.unsplash.com/photo-1587474260584-136574528ed5' },
      { id: 'dl-2', name: 'Qutub Minar', lat: 28.5244, lng: 77.1855, category: 'Monument', type: 'attraction', tags: ['unesco', 'historical'], rating: 4.6, image: 'https://images.unsplash.com/photo-1597074866923-dc0589150358' },
      { id: 'dl-3', name: 'India Gate', lat: 28.6129, lng: 77.2295, category: 'Monument', type: 'attraction', tags: ['memorial', 'landmark'], rating: 4.5, image: 'https://images.unsplash.com/photo-1587474260584-136574528ed5' },
      { id: 'dl-4', name: 'Lotus Temple', lat: 28.5535, lng: 77.2588, category: 'Temple', type: 'attraction', tags: ['modern', 'architecture'], rating: 4.7, image: 'https://images.unsplash.com/photo-1609137144813-7d9921338f24' },
    ],
    restaurants: [
      { id: 'dl-r1', name: 'Karim\'s', lat: 28.6506, lng: 77.2334, category: 'Mughlai', type: 'restaurant', tags: ['historic', 'mughlai'], rating: 4.5, image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe', priceLevel: 2 },
      { id: 'dl-r2', name: 'Indian Accent', lat: 28.5933, lng: 77.2507, category: 'Fine Dining', type: 'restaurant', tags: ['modern', 'fusion'], rating: 4.7, image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4', priceLevel: 4 },
    ],
    hotels: [
      { id: 'dl-h1', name: 'The Imperial', lat: 28.6289, lng: 77.2177, category: 'Luxury', type: 'hotel', tags: ['5-star', 'heritage'], rating: 4.7, image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945', price: 20000 },
    ],
  },
  'bangalore': {
    attractions: [
      { id: 'bg-1', name: 'Lalbagh Botanical Garden', lat: 12.9507, lng: 77.5848, category: 'Garden', type: 'attraction', tags: ['nature', 'park'], rating: 4.5, image: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae' },
      { id: 'bg-2', name: 'Bangalore Palace', lat: 12.9986, lng: 77.5926, category: 'Palace', type: 'attraction', tags: ['historical', 'architecture'], rating: 4.4, image: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da' },
      { id: 'bg-3', name: 'Cubbon Park', lat: 12.9762, lng: 77.5929, category: 'Park', type: 'attraction', tags: ['nature', 'park'], rating: 4.3, image: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae' },
    ],
    restaurants: [
      { id: 'bg-r1', name: 'MTR', lat: 12.9716, lng: 77.5946, category: 'South Indian', type: 'restaurant', tags: ['traditional', 'breakfast'], rating: 4.5, image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc', priceLevel: 1 },
      { id: 'bg-r2', name: 'Koshy\'s', lat: 12.9716, lng: 77.6033, category: 'Multi-cuisine', type: 'restaurant', tags: ['heritage', 'cafe'], rating: 4.3, image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4', priceLevel: 2 },
    ],
    hotels: [
      { id: 'bg-h1', name: 'Taj West End', lat: 12.9986, lng: 77.5926, category: 'Luxury', type: 'hotel', tags: ['5-star', 'heritage'], rating: 4.6, image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945', price: 15000 },
    ],
  },
  'goa': {
    attractions: [
      { id: 'ga-1', name: 'Baga Beach', lat: 15.5557, lng: 73.7516, category: 'Beach', type: 'attraction', tags: ['beach', 'water sports'], rating: 4.3, image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19' },
      { id: 'ga-2', name: 'Basilica of Bom Jesus', lat: 15.5008, lng: 73.9115, category: 'Church', type: 'attraction', tags: ['unesco', 'historical'], rating: 4.6, image: 'https://images.unsplash.com/photo-1609137144813-7d9921338f24' },
      { id: 'ga-3', name: 'Fort Aguada', lat: 15.4909, lng: 73.7731, category: 'Fort', type: 'attraction', tags: ['historical', 'scenic'], rating: 4.4, image: 'https://images.unsplash.com/photo-1477587458883-47145ed94245' },
    ],
    restaurants: [
      { id: 'ga-r1', name: 'Fisherman\'s Wharf', lat: 15.4909, lng: 73.8278, category: 'Seafood', type: 'restaurant', tags: ['seafood', 'goan'], rating: 4.4, image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19', priceLevel: 3 },
      { id: 'ga-r2', name: 'Vinayak Family Restaurant', lat: 15.2993, lng: 74.1240, category: 'Goan', type: 'restaurant', tags: ['local', 'seafood'], rating: 4.5, image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe', priceLevel: 2 },
    ],
    hotels: [
      { id: 'ga-h1', name: 'Taj Exotica', lat: 15.4000, lng: 73.8278, category: 'Luxury', type: 'hotel', tags: ['5-star', 'beach'], rating: 4.7, image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945', price: 18000 },
    ],
  },
};

// Generate generic POIs for cities not in database
function generateGenericPOIs(cityName: string, lat: number, lng: number): { attractions: POI[]; restaurants: POI[]; hotels: POI[] } {
  return {
    attractions: [
      { id: `${cityName}-1`, name: `${cityName} City Center`, lat, lng: lng + 0.01, category: 'Landmark', type: 'attraction', tags: ['city', 'landmark'], rating: 4.0, image: 'https://images.unsplash.com/photo-1477587458883-47145ed94245' },
      { id: `${cityName}-2`, name: `${cityName} Museum`, lat: lat + 0.01, lng, category: 'Museum', type: 'attraction', tags: ['culture', 'museum'], rating: 4.2, image: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da' },
      { id: `${cityName}-3`, name: `${cityName} Park`, lat: lat - 0.01, lng, category: 'Park', type: 'attraction', tags: ['nature', 'park'], rating: 4.1, image: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae' },
    ],
    restaurants: [
      { id: `${cityName}-r1`, name: `Local Restaurant ${cityName}`, lat, lng: lng + 0.005, category: 'Local Cuisine', type: 'restaurant', tags: ['local', 'traditional'], rating: 4.0, image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4', priceLevel: 2 },
      { id: `${cityName}-r2`, name: `${cityName} Cafe`, lat: lat + 0.005, lng, category: 'Cafe', type: 'restaurant', tags: ['cafe', 'snacks'], rating: 3.9, image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1', priceLevel: 1 },
    ],
    hotels: [
      { id: `${cityName}-h1`, name: `Hotel ${cityName}`, lat, lng: lng - 0.005, category: 'Hotel', type: 'hotel', tags: ['comfortable', 'central'], rating: 4.0, image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945', price: 5000 },
    ],
  };
}

function getLocalPOIs(cityName: string, lat: number, lng: number): { attractions: POI[]; restaurants: POI[]; hotels: POI[] } {
  const normalized = cityName.toLowerCase().trim();
  return LOCAL_POIS[normalized] || generateGenericPOIs(cityName, lat, lng);
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
  forceRefresh?: boolean;
}

export function usePOIs({
  lat,
  lng,
  radius = 15000,
  cityName,
  includeHotels = false,
  forceRefresh = false,
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
      setIsCached(false);
      return;
    }

    const fetchPOIs = async () => {
      console.log('🔄 Fetching POI data for', cityName, 'at', lat, lng);
      setIsLoading(true);
      setError(null);
      setIsCached(false);

      try {
        // Try edge function first
        const types = ['attraction', 'restaurant'];
        if (includeHotels) types.push('hotel');

        const { data, error: fetchError } = await supabase.functions.invoke('fetch-pois', {
          body: { 
            lat, 
            lng, 
            radius, 
            types,
            cityName 
          },
        });

        if (fetchError) throw fetchError;

        const pois: POI[] = data?.pois || [];
        const cached = data?.cached || false;

        // If edge function returns results, use them
        if (pois.length > 0) {
          const fetchedAttractions = pois.filter((p) => p.type === 'attraction');
          const fetchedRestaurants = pois.filter((p) => p.type === 'restaurant');
          const fetchedHotels = pois.filter((p) => p.type === 'hotel');
          
          console.log(`✅ Found ${fetchedAttractions.length} attractions, ${fetchedRestaurants.length} restaurants${includeHotels ? `, ${fetchedHotels.length} hotels` : ''} ${cached ? '(cached)' : '(fresh)'}`);
          
          setAttractions(fetchedAttractions);
          setRestaurants(fetchedRestaurants);
          setHotels(fetchedHotels);
          setIsCached(cached);
        } else {
          throw new Error('No POIs returned from edge function');
        }

      } catch (err) {
        // Fallback to local POI database
        console.warn('Edge function failed, using local POI fallback:', err);
        const localData = getLocalPOIs(cityName || 'Unknown', lat, lng);
        
        setAttractions(localData.attractions);
        setRestaurants(localData.restaurants);
        setHotels(includeHotels ? localData.hotels : []);
        setIsCached(false);
        setError(null); // Don't show error to user, fallback worked
        
        console.log(`✅ Using local fallback: ${localData.attractions.length} attractions, ${localData.restaurants.length} restaurants${includeHotels ? `, ${localData.hotels.length} hotels` : ''}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPOIs();
  }, [lat, lng, radius, cityName, includeHotels, fetchTrigger, forceRefresh]);

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
