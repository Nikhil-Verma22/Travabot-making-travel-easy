import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CitySearchResult {
  city: string;
  state: string | null;
  displayName: string;
  lat: number;
  lng: number;
}

// Popular Indian cities for fast prefix matching
const POPULAR_CITIES: CitySearchResult[] = [
  { city: "Mumbai", state: "Maharashtra", displayName: "Mumbai, Maharashtra, India", lat: 19.0760, lng: 72.8777 },
  { city: "Delhi", state: "Delhi", displayName: "Delhi, Delhi, India", lat: 28.7041, lng: 77.1025 },
  { city: "New Delhi", state: "Delhi", displayName: "New Delhi, Delhi, India", lat: 28.6139, lng: 77.2090 },
  { city: "Bangalore", state: "Karnataka", displayName: "Bangalore, Karnataka, India", lat: 12.9716, lng: 77.5946 },
  { city: "Bengaluru", state: "Karnataka", displayName: "Bengaluru, Karnataka, India", lat: 12.9716, lng: 77.5946 },
  { city: "Hyderabad", state: "Telangana", displayName: "Hyderabad, Telangana, India", lat: 17.3850, lng: 78.4867 },
  { city: "Chennai", state: "Tamil Nadu", displayName: "Chennai, Tamil Nadu, India", lat: 13.0827, lng: 80.2707 },
  { city: "Kolkata", state: "West Bengal", displayName: "Kolkata, West Bengal, India", lat: 22.5726, lng: 88.3639 },
  { city: "Pune", state: "Maharashtra", displayName: "Pune, Maharashtra, India", lat: 18.5204, lng: 73.8567 },
  { city: "Ahmedabad", state: "Gujarat", displayName: "Ahmedabad, Gujarat, India", lat: 23.0225, lng: 72.5714 },
  { city: "Jaipur", state: "Rajasthan", displayName: "Jaipur, Rajasthan, India", lat: 26.9124, lng: 75.7873 },
  { city: "Lucknow", state: "Uttar Pradesh", displayName: "Lucknow, Uttar Pradesh, India", lat: 26.8467, lng: 80.9462 },
  { city: "Chandigarh", state: "Chandigarh", displayName: "Chandigarh, Chandigarh, India", lat: 30.7333, lng: 76.7794 },
  { city: "Goa", state: "Goa", displayName: "Goa, Goa, India", lat: 15.2993, lng: 74.1240 },
  { city: "Panaji", state: "Goa", displayName: "Panaji, Goa, India", lat: 15.4909, lng: 73.8278 },
  { city: "Kochi", state: "Kerala", displayName: "Kochi, Kerala, India", lat: 9.9312, lng: 76.2673 },
  { city: "Thiruvananthapuram", state: "Kerala", displayName: "Thiruvananthapuram, Kerala, India", lat: 8.5241, lng: 76.9366 },
  { city: "Udaipur", state: "Rajasthan", displayName: "Udaipur, Rajasthan, India", lat: 24.5854, lng: 73.7125 },
  { city: "Jodhpur", state: "Rajasthan", displayName: "Jodhpur, Rajasthan, India", lat: 26.2389, lng: 73.0243 },
  { city: "Agra", state: "Uttar Pradesh", displayName: "Agra, Uttar Pradesh, India", lat: 27.1767, lng: 78.0081 },
  { city: "Varanasi", state: "Uttar Pradesh", displayName: "Varanasi, Uttar Pradesh, India", lat: 25.3176, lng: 82.9739 },
  { city: "Amritsar", state: "Punjab", displayName: "Amritsar, Punjab, India", lat: 31.6340, lng: 74.8723 },
  { city: "Shimla", state: "Himachal Pradesh", displayName: "Shimla, Himachal Pradesh, India", lat: 31.1048, lng: 77.1734 },
  { city: "Manali", state: "Himachal Pradesh", displayName: "Manali, Himachal Pradesh, India", lat: 32.2396, lng: 77.1887 },
  { city: "Darjeeling", state: "West Bengal", displayName: "Darjeeling, West Bengal, India", lat: 27.0410, lng: 88.2663 },
  { city: "Rishikesh", state: "Uttarakhand", displayName: "Rishikesh, Uttarakhand, India", lat: 30.0869, lng: 78.2676 },
  { city: "Haridwar", state: "Uttarakhand", displayName: "Haridwar, Uttarakhand, India", lat: 29.9457, lng: 78.1642 },
  { city: "Srinagar", state: "Jammu and Kashmir", displayName: "Srinagar, Jammu and Kashmir, India", lat: 34.0837, lng: 74.7973 },
  { city: "Mysore", state: "Karnataka", displayName: "Mysore, Karnataka, India", lat: 12.2958, lng: 76.6394 },
  { city: "Mysuru", state: "Karnataka", displayName: "Mysuru, Karnataka, India", lat: 12.2958, lng: 76.6394 },
  { city: "Coimbatore", state: "Tamil Nadu", displayName: "Coimbatore, Tamil Nadu, India", lat: 11.0168, lng: 76.9558 },
  { city: "Madurai", state: "Tamil Nadu", displayName: "Madurai, Tamil Nadu, India", lat: 9.9252, lng: 78.1198 },
  { city: "Bhopal", state: "Madhya Pradesh", displayName: "Bhopal, Madhya Pradesh, India", lat: 23.2599, lng: 77.4126 },
  { city: "Indore", state: "Madhya Pradesh", displayName: "Indore, Madhya Pradesh, India", lat: 22.7196, lng: 75.8577 },
  { city: "Nagpur", state: "Maharashtra", displayName: "Nagpur, Maharashtra, India", lat: 21.1458, lng: 79.0882 },
  { city: "Nashik", state: "Maharashtra", displayName: "Nashik, Maharashtra, India", lat: 19.9975, lng: 73.7898 },
  { city: "Surat", state: "Gujarat", displayName: "Surat, Gujarat, India", lat: 21.1702, lng: 72.8311 },
  { city: "Vadodara", state: "Gujarat", displayName: "Vadodara, Gujarat, India", lat: 22.3072, lng: 73.1812 },
  { city: "Rajkot", state: "Gujarat", displayName: "Rajkot, Gujarat, India", lat: 22.3039, lng: 70.8022 },
  { city: "Patna", state: "Bihar", displayName: "Patna, Bihar, India", lat: 25.5941, lng: 85.1376 },
  { city: "Ranchi", state: "Jharkhand", displayName: "Ranchi, Jharkhand, India", lat: 23.3441, lng: 85.3096 },
  { city: "Bhubaneswar", state: "Odisha", displayName: "Bhubaneswar, Odisha, India", lat: 20.2961, lng: 85.8245 },
  { city: "Visakhapatnam", state: "Andhra Pradesh", displayName: "Visakhapatnam, Andhra Pradesh, India", lat: 17.6868, lng: 83.2185 },
  { city: "Vijayawada", state: "Andhra Pradesh", displayName: "Vijayawada, Andhra Pradesh, India", lat: 16.5062, lng: 80.6480 },
  { city: "Guwahati", state: "Assam", displayName: "Guwahati, Assam, India", lat: 26.1445, lng: 91.7362 },
  { city: "Dehradun", state: "Uttarakhand", displayName: "Dehradun, Uttarakhand, India", lat: 30.3165, lng: 78.0322 },
  { city: "Jaisalmer", state: "Rajasthan", displayName: "Jaisalmer, Rajasthan, India", lat: 26.9157, lng: 70.9083 },
  { city: "Pushkar", state: "Rajasthan", displayName: "Pushkar, Rajasthan, India", lat: 26.4899, lng: 74.5510 },
  { city: "Mount Abu", state: "Rajasthan", displayName: "Mount Abu, Rajasthan, India", lat: 24.5926, lng: 72.7156 },
  { city: "Ooty", state: "Tamil Nadu", displayName: "Ooty, Tamil Nadu, India", lat: 11.4102, lng: 76.6950 },
  { city: "Munnar", state: "Kerala", displayName: "Munnar, Kerala, India", lat: 10.0889, lng: 77.0595 },
  { city: "Alleppey", state: "Kerala", displayName: "Alleppey, Kerala, India", lat: 9.4981, lng: 76.3388 },
  { city: "Leh", state: "Ladakh", displayName: "Leh, Ladakh, India", lat: 34.1526, lng: 77.5771 },
  { city: "Gangtok", state: "Sikkim", displayName: "Gangtok, Sikkim, India", lat: 27.3389, lng: 88.6065 },
  { city: "Nainital", state: "Uttarakhand", displayName: "Nainital, Uttarakhand, India", lat: 29.3803, lng: 79.4636 },
  { city: "Mussoorie", state: "Uttarakhand", displayName: "Mussoorie, Uttarakhand, India", lat: 30.4598, lng: 78.0644 },
  { city: "Kodaikanal", state: "Tamil Nadu", displayName: "Kodaikanal, Tamil Nadu, India", lat: 10.2381, lng: 77.4892 },
  { city: "Pondicherry", state: "Puducherry", displayName: "Pondicherry, Puducherry, India", lat: 11.9416, lng: 79.8083 },
  { city: "Aurangabad", state: "Maharashtra", displayName: "Aurangabad, Maharashtra, India", lat: 19.8762, lng: 75.3433 },
  { city: "Ajmer", state: "Rajasthan", displayName: "Ajmer, Rajasthan, India", lat: 26.4499, lng: 74.6399 },
  { city: "Raipur", state: "Chhattisgarh", displayName: "Raipur, Chhattisgarh, India", lat: 21.2514, lng: 81.6296 },
  { city: "Jammu", state: "Jammu and Kashmir", displayName: "Jammu, Jammu and Kashmir, India", lat: 32.7266, lng: 74.8570 },
];

// Fast fuzzy search for local cities
function searchLocalCities(query: string, limit: number): CitySearchResult[] {
  const normalizedQuery = query.toLowerCase().trim();
  
  // First, exact prefix matches (highest priority)
  const prefixMatches = POPULAR_CITIES.filter(city => 
    city.city.toLowerCase().startsWith(normalizedQuery)
  );
  
  // Then, word-start matches
  const wordStartMatches = POPULAR_CITIES.filter(city => {
    const words = city.city.toLowerCase().split(/\s+/);
    return words.some(word => word.startsWith(normalizedQuery)) && 
           !city.city.toLowerCase().startsWith(normalizedQuery);
  });
  
  // Finally, contains matches
  const containsMatches = POPULAR_CITIES.filter(city => 
    city.city.toLowerCase().includes(normalizedQuery) &&
    !city.city.toLowerCase().startsWith(normalizedQuery) &&
    !city.city.toLowerCase().split(/\s+/).some(word => word.startsWith(normalizedQuery))
  );
  
  // Combine and dedupe
  const combined = [...prefixMatches, ...wordStartMatches, ...containsMatches];
  const seen = new Set<string>();
  return combined
    .filter(city => {
      const key = `${city.city}-${city.state}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, country = "India", limit = 5 } = await req.json();

    if (!query || typeof query !== "string" || query.length < 2) {
      return new Response(
        JSON.stringify({ results: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // First, try local search for popular cities (instant)
    const localResults = searchLocalCities(query, limit);
    
    // If we have enough local results, return immediately
    if (localResults.length >= limit) {
      return new Response(
        JSON.stringify({ results: localResults }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Otherwise, also query Nominatim for more results
    const searchQuery = `${query}, ${country}`;
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=${limit + 5}&addressdetails=1&countrycodes=in&featuretype=city`;
    
    console.log(`Searching cities: ${searchQuery}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout
    
    try {
      const nominatimResponse = await fetch(nominatimUrl, {
        headers: {
          "User-Agent": "TravaBOT/1.0 (travel-planner-app)",
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!nominatimResponse.ok) {
        // If API fails, return local results
        return new Response(
          JSON.stringify({ results: localResults }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const results = await nominatimResponse.json();

      // Filter and format API results
      const apiResults: CitySearchResult[] = results
        .filter((r: any) => {
          // Only accept actual cities/towns, not administrative regions
          const validTypes = ["city", "town", "village", "municipality"];
          const invalidKeywords = ["tahsil", "district", "division", "block", "tehsil"];
          const displayName = (r.display_name || "").toLowerCase();
          const hasInvalidKeyword = invalidKeywords.some(kw => displayName.includes(kw));
          return validTypes.includes(r.type) && !hasInvalidKeyword;
        })
        .map((r: any) => {
          const address = r.address || {};
          const cityName = address.city || address.town || address.village || address.municipality || r.name;
          const stateName = address.state || null;
          
          return {
            city: cityName,
            state: stateName,
            displayName: `${cityName}${stateName ? `, ${stateName}` : ""}, India`,
            lat: parseFloat(r.lat),
            lng: parseFloat(r.lon),
          };
        })
        .filter((r: CitySearchResult) => r.city && r.city.length > 0);

      // Merge local and API results, prioritizing local
      const localCityKeys = new Set(localResults.map(c => `${c.city.toLowerCase()}-${c.state?.toLowerCase()}`));
      const filteredApiResults = apiResults.filter(c => 
        !localCityKeys.has(`${c.city.toLowerCase()}-${c.state?.toLowerCase()}`)
      );
      
      const mergedResults = [...localResults, ...filteredApiResults]
        .slice(0, limit);

      return new Response(
        JSON.stringify({ results: mergedResults }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (fetchError) {
      clearTimeout(timeoutId);
      // On timeout or fetch error, return local results
      return new Response(
        JSON.stringify({ results: localResults }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Search error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error", results: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
