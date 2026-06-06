import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CitySearchResult {
  city: string;
  state: string | null;
  displayName: string;
  lat: number;
  lng: number;
}

// Comprehensive local database of Indian cities (fallback)
const LOCAL_CITIES: CitySearchResult[] = [
  { city: 'Mumbai', state: 'Maharashtra', displayName: 'Mumbai, Maharashtra', lat: 19.0760, lng: 72.8777 },
  { city: 'Delhi', state: 'Delhi', displayName: 'New Delhi, Delhi', lat: 28.7041, lng: 77.1025 },
  { city: 'Bangalore', state: 'Karnataka', displayName: 'Bangalore, Karnataka', lat: 12.9716, lng: 77.5946 },
  { city: 'Bengaluru', state: 'Karnataka', displayName: 'Bengaluru, Karnataka', lat: 12.9716, lng: 77.5946 },
  { city: 'Hyderabad', state: 'Telangana', displayName: 'Hyderabad, Telangana', lat: 17.3850, lng: 78.4867 },
  { city: 'Chennai', state: 'Tamil Nadu', displayName: 'Chennai, Tamil Nadu', lat: 13.0827, lng: 80.2707 },
  { city: 'Kolkata', state: 'West Bengal', displayName: 'Kolkata, West Bengal', lat: 22.5726, lng: 88.3639 },
  { city: 'Pune', state: 'Maharashtra', displayName: 'Pune, Maharashtra', lat: 18.5204, lng: 73.8567 },
  { city: 'Ahmedabad', state: 'Gujarat', displayName: 'Ahmedabad, Gujarat', lat: 23.0225, lng: 72.5714 },
  { city: 'Jaipur', state: 'Rajasthan', displayName: 'Jaipur, Rajasthan', lat: 26.9124, lng: 75.7873 },
  { city: 'Surat', state: 'Gujarat', displayName: 'Surat, Gujarat', lat: 21.1702, lng: 72.8311 },
  { city: 'Lucknow', state: 'Uttar Pradesh', displayName: 'Lucknow, Uttar Pradesh', lat: 26.8467, lng: 80.9462 },
  { city: 'Kanpur', state: 'Uttar Pradesh', displayName: 'Kanpur, Uttar Pradesh', lat: 26.4499, lng: 80.3319 },
  { city: 'Nagpur', state: 'Maharashtra', displayName: 'Nagpur, Maharashtra', lat: 21.1458, lng: 79.0882 },
  { city: 'Indore', state: 'Madhya Pradesh', displayName: 'Indore, Madhya Pradesh', lat: 22.7196, lng: 75.8577 },
  { city: 'Thane', state: 'Maharashtra', displayName: 'Thane, Maharashtra', lat: 19.2183, lng: 72.9781 },
  { city: 'Bhopal', state: 'Madhya Pradesh', displayName: 'Bhopal, Madhya Pradesh', lat: 23.2599, lng: 77.4126 },
  { city: 'Visakhapatnam', state: 'Andhra Pradesh', displayName: 'Visakhapatnam, Andhra Pradesh', lat: 17.6868, lng: 83.2185 },
  { city: 'Pimpri-Chinchwad', state: 'Maharashtra', displayName: 'Pimpri-Chinchwad, Maharashtra', lat: 18.6298, lng: 73.7997 },
  { city: 'Patna', state: 'Bihar', displayName: 'Patna, Bihar', lat: 25.5941, lng: 85.1376 },
  { city: 'Vadodara', state: 'Gujarat', displayName: 'Vadodara, Gujarat', lat: 22.3072, lng: 73.1812 },
  { city: 'Ghaziabad', state: 'Uttar Pradesh', displayName: 'Ghaziabad, Uttar Pradesh', lat: 28.6692, lng: 77.4538 },
  { city: 'Ludhiana', state: 'Punjab', displayName: 'Ludhiana, Punjab', lat: 30.9010, lng: 75.8573 },
  { city: 'Agra', state: 'Uttar Pradesh', displayName: 'Agra, Uttar Pradesh', lat: 27.1767, lng: 78.0081 },
  { city: 'Nashik', state: 'Maharashtra', displayName: 'Nashik, Maharashtra', lat: 19.9975, lng: 73.7898 },
  { city: 'Faridabad', state: 'Haryana', displayName: 'Faridabad, Haryana', lat: 28.4089, lng: 77.3178 },
  { city: 'Meerut', state: 'Uttar Pradesh', displayName: 'Meerut, Uttar Pradesh', lat: 28.9845, lng: 77.7064 },
  { city: 'Rajkot', state: 'Gujarat', displayName: 'Rajkot, Gujarat', lat: 22.3039, lng: 70.8022 },
  { city: 'Kalyan-Dombivali', state: 'Maharashtra', displayName: 'Kalyan-Dombivali, Maharashtra', lat: 19.2403, lng: 73.1305 },
  { city: 'Vasai-Virar', state: 'Maharashtra', displayName: 'Vasai-Virar, Maharashtra', lat: 19.4612, lng: 72.7985 },
  { city: 'Varanasi', state: 'Uttar Pradesh', displayName: 'Varanasi, Uttar Pradesh', lat: 25.3176, lng: 82.9739 },
  { city: 'Srinagar', state: 'Jammu and Kashmir', displayName: 'Srinagar, Jammu and Kashmir', lat: 34.0837, lng: 74.7973 },
  { city: 'Aurangabad', state: 'Maharashtra', displayName: 'Aurangabad, Maharashtra', lat: 19.8762, lng: 75.3433 },
  { city: 'Dhanbad', state: 'Jharkhand', displayName: 'Dhanbad, Jharkhand', lat: 23.7957, lng: 86.4304 },
  { city: 'Amritsar', state: 'Punjab', displayName: 'Amritsar, Punjab', lat: 31.6340, lng: 74.8723 },
  { city: 'Navi Mumbai', state: 'Maharashtra', displayName: 'Navi Mumbai, Maharashtra', lat: 19.0330, lng: 73.0297 },
  { city: 'Allahabad', state: 'Uttar Pradesh', displayName: 'Prayagraj (Allahabad), Uttar Pradesh', lat: 25.4358, lng: 81.8463 },
  { city: 'Ranchi', state: 'Jharkhand', displayName: 'Ranchi, Jharkhand', lat: 23.3441, lng: 85.3096 },
  { city: 'Howrah', state: 'West Bengal', displayName: 'Howrah, West Bengal', lat: 22.5958, lng: 88.2636 },
  { city: 'Coimbatore', state: 'Tamil Nadu', displayName: 'Coimbatore, Tamil Nadu', lat: 11.0168, lng: 76.9558 },
  { city: 'Jabalpur', state: 'Madhya Pradesh', displayName: 'Jabalpur, Madhya Pradesh', lat: 23.1815, lng: 79.9864 },
  { city: 'Gwalior', state: 'Madhya Pradesh', displayName: 'Gwalior, Madhya Pradesh', lat: 26.2183, lng: 78.1828 },
  { city: 'Vijayawada', state: 'Andhra Pradesh', displayName: 'Vijayawada, Andhra Pradesh', lat: 16.5062, lng: 80.6480 },
  { city: 'Jodhpur', state: 'Rajasthan', displayName: 'Jodhpur, Rajasthan', lat: 26.2389, lng: 73.0243 },
  { city: 'Madurai', state: 'Tamil Nadu', displayName: 'Madurai, Tamil Nadu', lat: 9.9252, lng: 78.1198 },
  { city: 'Raipur', state: 'Chhattisgarh', displayName: 'Raipur, Chhattisgarh', lat: 21.2514, lng: 81.6296 },
  { city: 'Kota', state: 'Rajasthan', displayName: 'Kota, Rajasthan', lat: 25.2138, lng: 75.8648 },
  { city: 'Guwahati', state: 'Assam', displayName: 'Guwahati, Assam', lat: 26.1445, lng: 91.7362 },
  { city: 'Chandigarh', state: 'Chandigarh', displayName: 'Chandigarh', lat: 30.7333, lng: 76.7794 },
  { city: 'Goa', state: 'Goa', displayName: 'Goa', lat: 15.2993, lng: 74.1240 },
  { city: 'Panaji', state: 'Goa', displayName: 'Panaji, Goa', lat: 15.4909, lng: 73.8278 },
  { city: 'Kochi', state: 'Kerala', displayName: 'Kochi, Kerala', lat: 9.9312, lng: 76.2673 },
  { city: 'Thiruvananthapuram', state: 'Kerala', displayName: 'Thiruvananthapuram, Kerala', lat: 8.5241, lng: 76.9366 },
  { city: 'Udaipur', state: 'Rajasthan', displayName: 'Udaipur, Rajasthan', lat: 24.5854, lng: 73.7125 },
  { city: 'Shimla', state: 'Himachal Pradesh', displayName: 'Shimla, Himachal Pradesh', lat: 31.1048, lng: 77.1734 },
  { city: 'Manali', state: 'Himachal Pradesh', displayName: 'Manali, Himachal Pradesh', lat: 32.2396, lng: 77.1887 },
  { city: 'Darjeeling', state: 'West Bengal', displayName: 'Darjeeling, West Bengal', lat: 27.0410, lng: 88.2663 },
  { city: 'Rishikesh', state: 'Uttarakhand', displayName: 'Rishikesh, Uttarakhand', lat: 30.0869, lng: 78.2676 },
  { city: 'Haridwar', state: 'Uttarakhand', displayName: 'Haridwar, Uttarakhand', lat: 29.9457, lng: 78.1642 },
  { city: 'Mysore', state: 'Karnataka', displayName: 'Mysore, Karnataka', lat: 12.2958, lng: 76.6394 },
  { city: 'Mysuru', state: 'Karnataka', displayName: 'Mysuru, Karnataka', lat: 12.2958, lng: 76.6394 },
  { city: 'Ooty', state: 'Tamil Nadu', displayName: 'Ooty, Tamil Nadu', lat: 11.4102, lng: 76.6950 },
  { city: 'Munnar', state: 'Kerala', displayName: 'Munnar, Kerala', lat: 10.0889, lng: 77.0595 },
  { city: 'Alleppey', state: 'Kerala', displayName: 'Alleppey, Kerala', lat: 9.4981, lng: 76.3388 },
  { city: 'Leh', state: 'Ladakh', displayName: 'Leh, Ladakh', lat: 34.1526, lng: 77.5771 },
  { city: 'Gangtok', state: 'Sikkim', displayName: 'Gangtok, Sikkim', lat: 27.3389, lng: 88.6065 },
  { city: 'Nainital', state: 'Uttarakhand', displayName: 'Nainital, Uttarakhand', lat: 29.3803, lng: 79.4636 },
  { city: 'Mussoorie', state: 'Uttarakhand', displayName: 'Mussoorie, Uttarakhand', lat: 30.4598, lng: 78.0644 },
  { city: 'Kodaikanal', state: 'Tamil Nadu', displayName: 'Kodaikanal, Tamil Nadu', lat: 10.2381, lng: 77.4892 },
  { city: 'Pondicherry', state: 'Puducherry', displayName: 'Pondicherry, Puducherry', lat: 11.9416, lng: 79.8083 },
  { city: 'Jaisalmer', state: 'Rajasthan', displayName: 'Jaisalmer, Rajasthan', lat: 26.9157, lng: 70.9083 },
  { city: 'Pushkar', state: 'Rajasthan', displayName: 'Pushkar, Rajasthan', lat: 26.4899, lng: 74.5510 },
  { city: 'Mount Abu', state: 'Rajasthan', displayName: 'Mount Abu, Rajasthan', lat: 24.5926, lng: 72.7156 },
  { city: 'Ajmer', state: 'Rajasthan', displayName: 'Ajmer, Rajasthan', lat: 26.4499, lng: 74.6399 },
  { city: 'Bhubaneswar', state: 'Odisha', displayName: 'Bhubaneswar, Odisha', lat: 20.2961, lng: 85.8245 },
  { city: 'Puri', state: 'Odisha', displayName: 'Puri, Odisha', lat: 19.8135, lng: 85.8312 },
  { city: 'Dehradun', state: 'Uttarakhand', displayName: 'Dehradun, Uttarakhand', lat: 30.3165, lng: 78.0322 },
  { city: 'Jammu', state: 'Jammu and Kashmir', displayName: 'Jammu, Jammu and Kashmir', lat: 32.7266, lng: 74.8570 },
];

// Simple fuzzy search
function searchLocalCities(query: string, limit: number = 8): CitySearchResult[] {
  const q = query.toLowerCase().trim();
  
  // Exact matches first
  const exact = LOCAL_CITIES.filter(c => c.city.toLowerCase() === q);
  
  // Starts with
  const startsWith = LOCAL_CITIES.filter(c => 
    c.city.toLowerCase().startsWith(q) && !exact.includes(c)
  );
  
  // Contains
  const contains = LOCAL_CITIES.filter(c => 
    c.city.toLowerCase().includes(q) && !exact.includes(c) && !startsWith.includes(c)
  );
  
  return [...exact, ...startsWith, ...contains].slice(0, limit);
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
    if (!query || query.length < 1) {
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
      // Try edge function first
      const { data, error: searchError } = await supabase.functions.invoke('search-cities', {
        body: { query, limit: 8 },
      });

      if (searchError) throw searchError;

      const searchResults = data?.results || [];
      
      // If edge function returns results, use them
      if (searchResults.length > 0) {
        searchCache.set(normalizedQuery, { results: searchResults, timestamp: Date.now() });
        setResults(searchResults);
        console.log('✅ Using edge function results');
      } else {
        // Fallback to local search
        const localResults = searchLocalCities(query, 8);
        searchCache.set(normalizedQuery, { results: localResults, timestamp: Date.now() });
        setResults(localResults);
        console.log('✅ Using local fallback results');
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      
      // On error, use local fallback
      console.warn('Edge function failed, using local fallback:', err);
      const localResults = searchLocalCities(query, 8);
      searchCache.set(normalizedQuery, { results: localResults, timestamp: Date.now() });
      setResults(localResults);
      setError(null); // Don't show error to user, fallback worked
    } finally {
      setIsLoading(false);
    }
  }, []);

  const geocodeCity = useCallback(async (city: string): Promise<CitySearchResult | null> => {
    try {
      // Try edge function first
      const { data, error: geocodeError } = await supabase.functions.invoke('geocode-city', {
        body: { city },
      });

      if (!geocodeError && data?.result) {
        return data.result;
      }
    } catch (err) {
      console.warn('Geocode edge function failed, using local fallback');
    }
    
    // Fallback to local search
    const normalized = city.toLowerCase();
    return LOCAL_CITIES.find(c => c.city.toLowerCase() === normalized) || null;
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
