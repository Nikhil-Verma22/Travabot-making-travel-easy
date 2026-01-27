import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to get AI configuration
// Supports both Lovable AI Gateway and OpenAI for local development
function getAIConfig() {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  
  if (LOVABLE_API_KEY) {
    return {
      apiKey: LOVABLE_API_KEY,
      baseUrl: "https://ai.gateway.lovable.dev/v1/chat/completions",
      model: "google/gemini-2.5-flash"
    };
  } else if (OPENAI_API_KEY) {
    return {
      apiKey: OPENAI_API_KEY,
      baseUrl: "https://api.openai.com/v1/chat/completions",
      model: "gpt-4o-mini"
    };
  }
  return null;
}

interface ItineraryRequest {
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
  sourceLat?: number;
  sourceLng?: number;
}

// Calculate distance between two points using Haversine formula (in km)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Sort locations using nearest neighbor algorithm
function optimizeRoute(
  locations: Array<{ name: string; lat: number; lng: number; type: string }>,
  startLat: number,
  startLng: number
): Array<{ name: string; lat: number; lng: number; type: string }> {
  if (locations.length <= 1) return locations;
  
  const unvisited = [...locations];
  const route: typeof locations = [];
  let currentLat = startLat;
  let currentLng = startLng;
  
  while (unvisited.length > 0) {
    let nearestIdx = 0;
    let nearestDist = Infinity;
    
    for (let i = 0; i < unvisited.length; i++) {
      const dist = calculateDistance(currentLat, currentLng, unvisited[i].lat, unvisited[i].lng);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = i;
      }
    }
    
    const nearest = unvisited.splice(nearestIdx, 1)[0];
    route.push(nearest);
    currentLat = nearest.lat;
    currentLng = nearest.lng;
  }
  
  return route;
}

// Calculate total route distance
function calculateTotalDistance(
  locations: Array<{ lat: number; lng: number }>,
  startLat: number,
  startLng: number
): number {
  if (locations.length === 0) return 0;
  
  let totalDist = calculateDistance(startLat, startLng, locations[0].lat, locations[0].lng);
  
  for (let i = 0; i < locations.length - 1; i++) {
    totalDist += calculateDistance(locations[i].lat, locations[i].lng, locations[i + 1].lat, locations[i + 1].lng);
  }
  
  // Add return to start
  totalDist += calculateDistance(
    locations[locations.length - 1].lat,
    locations[locations.length - 1].lng,
    startLat,
    startLng
  );
  
  return totalDist;
}

// Geocode a location using Nominatim
async function geocodeLocation(query: string, nearLat?: number, nearLng?: number): Promise<{ lat: number; lng: number } | null> {
  try {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      limit: '1',
    });
    
    if (nearLat && nearLng) {
      params.set('viewbox', `${nearLng - 2},${nearLat + 2},${nearLng + 2},${nearLat - 2}`);
      params.set('bounded', '0');
    }
    
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { 'User-Agent': 'TravelBot/1.0' }
    });
    
    if (!response.ok) return null;
    
    const results = await response.json();
    if (results.length > 0) {
      return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
    }
    return null;
  } catch (e) {
    console.error("Geocoding error:", e);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      destinationCity, 
      destinationState, 
      destinationLat,
      destinationLng,
      startDate, 
      endDate, 
      travelers,
      selectedAttractions,
      selectedRestaurants,
      selectedHotel,
      transportType,
      sourceLat,
      sourceLng
    } = await req.json() as ItineraryRequest;
    
    console.log(`Generating optimized itinerary for ${destinationCity} from ${startDate} to ${endDate}`);
    console.log("Attractions:", selectedAttractions);
    console.log("Restaurants:", selectedRestaurants);
    console.log("Hotel:", selectedHotel);

    // Get AI configuration - supports both Lovable AI and OpenAI
    const aiConfig = getAIConfig();
    if (!aiConfig) {
      throw new Error("No AI API key configured. Set either LOVABLE_API_KEY or OPENAI_API_KEY in your edge function secrets.");
    }

    const destination = destinationState ? `${destinationCity}, ${destinationState}` : destinationCity;
    const hotelName = selectedHotel?.name || "Selected Hotel";

    // Calculate number of days
    const start = new Date(startDate);
    const end = new Date(endDate);
    const numDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Prepare locations with coordinates for optimization
    const allLocations: Array<{ name: string; lat: number; lng: number; type: string }> = [];
    
    selectedAttractions.forEach(a => {
      if (a.lat && a.lng) {
        allLocations.push({ name: a.name, lat: a.lat, lng: a.lng, type: 'attraction' });
      }
    });
    
    selectedRestaurants.forEach(r => {
      if (r.lat && r.lng) {
        allLocations.push({ name: r.name, lat: r.lat, lng: r.lng, type: 'restaurant' });
      }
    });

    // Use hotel or destination center as base location
    const baseLat = selectedHotel?.lat || destinationLat || 0;
    const baseLng = selectedHotel?.lng || destinationLng || 0;

    // Feasibility check: estimate if itinerary is realistic
    // Assume: 2-3 hours per attraction, 1.5 hours per restaurant, ~7 hours of activity time per day
    const attractionsCount = selectedAttractions.length;
    const restaurantsCount = selectedRestaurants.length;
    const estimatedHours = (attractionsCount * 2.5) + (restaurantsCount * 1.5);
    const availableHours = numDays * 7; // 7 hours of activity per day
    
    // Calculate total distance if we have coordinates
    let totalDistanceKm = 0;
    if (allLocations.length > 0 && baseLat !== 0) {
      const optimizedLocations = optimizeRoute(allLocations, baseLat, baseLng);
      totalDistanceKm = calculateTotalDistance(optimizedLocations, baseLat, baseLng);
    }
    
    // Estimate travel time: assume average 25 km/h in city (accounting for traffic, stops)
    const estimatedTravelHours = totalDistanceKm / 25;
    const totalRequiredHours = estimatedHours + estimatedTravelHours;
    
    console.log(`Feasibility: ${attractionsCount} attractions, ${restaurantsCount} restaurants`);
    console.log(`Estimated activity hours: ${estimatedHours.toFixed(1)}, travel hours: ${estimatedTravelHours.toFixed(1)}, total: ${totalRequiredHours.toFixed(1)}`);
    console.log(`Available hours: ${availableHours}, Total distance: ${totalDistanceKm.toFixed(1)} km`);

    // Check feasibility
    if (totalRequiredHours > availableHours * 1.3) { // Allow 30% buffer
      const suggestedDays = Math.ceil(totalRequiredHours / 7);
      const maxPlacesForDays = Math.floor(availableHours / 2.5); // Rough estimate
      
      return new Response(JSON.stringify({ 
        error: `The selected itinerary is not feasible within ${numDays} day(s). You have ${attractionsCount + restaurantsCount} places requiring approximately ${Math.ceil(totalRequiredHours)} hours (including ${Math.ceil(estimatedTravelHours)} hours of travel for ${Math.ceil(totalDistanceKm)} km), but only ${availableHours} hours are available. Please either increase your trip to at least ${suggestedDays} days, or reduce the number of selected locations to ${maxPlacesForDays} or fewer for a comfortable trip.`
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Optimize route to minimize travel distance
    let optimizedLocations = allLocations;
    if (allLocations.length > 0 && baseLat !== 0) {
      optimizedLocations = optimizeRoute(allLocations, baseLat, baseLng);
      console.log("Optimized route order:", optimizedLocations.map(l => l.name));
    }

    // Group locations by day for efficient scheduling
    const locationsPerDay = Math.ceil(optimizedLocations.length / Math.max(numDays - 1, 1)); // Reserve first/last day for travel
    const dayGroups: Array<typeof optimizedLocations> = [];
    
    for (let i = 0; i < optimizedLocations.length; i += locationsPerDay) {
      dayGroups.push(optimizedLocations.slice(i, i + locationsPerDay));
    }

    // Build location map for coordinates
    const locationMap: Record<string, { lat: number; lng: number }> = {};
    
    selectedAttractions.forEach(a => {
      if (a.lat && a.lng) locationMap[a.name.toLowerCase()] = { lat: a.lat, lng: a.lng };
    });
    
    selectedRestaurants.forEach(r => {
      if (r.lat && r.lng) locationMap[r.name.toLowerCase()] = { lat: r.lat, lng: r.lng };
    });
    
    if (selectedHotel?.name && selectedHotel.lat && selectedHotel.lng) {
      locationMap[selectedHotel.name.toLowerCase()] = { lat: selectedHotel.lat, lng: selectedHotel.lng };
      locationMap['hotel'] = { lat: selectedHotel.lat, lng: selectedHotel.lng };
      locationMap['selected hotel'] = { lat: selectedHotel.lat, lng: selectedHotel.lng };
    }

    // Create optimized place order for AI prompt
    const optimizedAttractionsList = optimizedLocations
      .filter(l => l.type === 'attraction')
      .map(l => l.name)
      .join(", ") || "local attractions";
    
    const optimizedRestaurantsList = optimizedLocations
      .filter(l => l.type === 'restaurant')
      .map(l => l.name)
      .join(", ") || "local restaurants";

    // Create day grouping instructions for AI
    const dayGroupingInstructions = dayGroups.map((group, idx) => {
      if (idx === 0 && numDays > 1) {
        return `Day ${idx + 1}: Arrival day - visit ${group.slice(0, 2).map(l => l.name).join(", ")} (they are nearby)`;
      } else if (idx === dayGroups.length - 1 && numDays > 1) {
        return `Day ${idx + 2}: Departure day - visit ${group.map(l => l.name).join(", ")} before leaving (they are nearby)`;
      }
      return `Day ${idx + 2}: Visit ${group.map(l => l.name).join(", ")} (grouped by proximity to minimize travel)`;
    }).join("\n");

    const systemPrompt = `You are a travel itinerary planner specializing in creating EFFICIENT, OPTIMIZED day-by-day travel plans.

CRITICAL OPTIMIZATION RULES:
1. MINIMIZE TRAVEL DISTANCE - Group nearby places together in the same time slots
2. NO BACKTRACKING - Once you leave an area, don't return to it later the same day
3. LOGICAL SEQUENCING - Visit places in a geographical order, moving from one area to the next
4. MEAL TIMING - Place restaurant visits at appropriate meal times (lunch: 12-2 PM, dinner: 7-9 PM)
5. REALISTIC TIMING - Allow 2-3 hours per major attraction, 1-1.5 hours per restaurant

The locations have been PRE-OPTIMIZED for minimal travel. Follow the provided order closely.

Return the itinerary as specified in the tool parameters.`;

    const userPrompt = `Create a ${numDays}-day TRAVEL-OPTIMIZED itinerary for ${travelers} travelers visiting ${destination}.

Trip Details:
- Check-in Date: ${startDate}
- Check-out Date: ${endDate}
- Hotel: ${hotelName}
- Transport Type: ${transportType}
- Total travel distance for all places: ~${Math.ceil(totalDistanceKm)} km

OPTIMIZED PLACE ORDER (follow this order to minimize travel):
Attractions: ${optimizedAttractionsList}
Restaurants: ${optimizedRestaurantsList}

${dayGroupingInstructions ? `\nSUGGESTED DAY GROUPINGS (places grouped by proximity):\n${dayGroupingInstructions}` : ''}

REQUIREMENTS:
- Day 1: Include arrival at ${destinationCity} ${transportType === 'Flight' ? 'Airport' : transportType === 'Train' ? 'Railway Station' : 'Bus Terminal'}, hotel check-in at ${hotelName}
- Last day: Include hotel checkout and departure from ${destinationCity} ${transportType === 'Flight' ? 'Airport' : transportType === 'Train' ? 'Railway Station' : 'Bus Terminal'}
- IMPORTANT: Follow the optimized place order above to minimize travel between locations
- Group nearby places on the same day
- Each day should have 3-5 activities with realistic timings
- Use the EXACT place names provided above for location field
- For transport activities, use full location names like "${destinationCity} Airport" or "${destinationCity} Railway Station"`;

    const response = await fetch(aiConfig.baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${aiConfig.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: aiConfig.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_itinerary",
              description: "Generate a day-by-day travel itinerary optimized for minimal travel distance",
              parameters: {
                type: "object",
                properties: {
                  days: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        day: { type: "number" },
                        date: { type: "string", description: "Date in format like 'Oct 10, 2025'" },
                        title: { type: "string", description: "Day theme/title" },
                        activities: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              time: { type: "string", description: "Time like '9:00 AM'" },
                              type: { type: "string", enum: ["transport", "hotel", "attraction", "restaurant", "shopping", "activity"] },
                              title: { type: "string" },
                              description: { type: "string" },
                              location: { type: "string", description: "Use EXACT place name from provided list, or full location like 'City Airport'" }
                            },
                            required: ["time", "type", "title", "description", "location"]
                          }
                        }
                      },
                      required: ["day", "date", "title", "activities"]
                    }
                  }
                },
                required: ["days"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_itinerary" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI response:", JSON.stringify(data, null, 2));

    // Extract the tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("No tool call in response");
    }

    const itinerary = JSON.parse(toolCall.function.arguments);
    
    // Collect all locations that need geocoding
    const locationsToGeocode: { dayIdx: number; actIdx: number; location: string }[] = [];
    
    // Enrich activities with coordinates
    if (itinerary.days) {
      itinerary.days = itinerary.days.map((day: any, dayIdx: number) => ({
        ...day,
        activities: day.activities.map((activity: any, actIdx: number) => {
          const locationLower = activity.location?.toLowerCase() || '';
          const titleLower = activity.title?.toLowerCase() || '';
          
          // Try exact match first
          let coords = locationMap[locationLower];
          
          if (!coords) {
            // Try partial match on location
            for (const [name, c] of Object.entries(locationMap)) {
              if (locationLower.includes(name) || name.includes(locationLower)) {
                coords = c;
                break;
              }
            }
          }
          
          if (!coords) {
            // Try partial match on title
            for (const [name, c] of Object.entries(locationMap)) {
              if (titleLower.includes(name) || name.includes(titleLower)) {
                coords = c;
                break;
              }
            }
          }
          
          // Check for hotel-related activities
          if (!coords && (activity.type === 'hotel' || locationLower.includes('hotel') || titleLower.includes('check-in') || titleLower.includes('checkout'))) {
            coords = locationMap['hotel'];
          }
          
          // If still no coords, mark for geocoding
          if (!coords && activity.location) {
            locationsToGeocode.push({ dayIdx, actIdx, location: activity.location });
          }
          
          return {
            ...activity,
            lat: coords?.lat || null,
            lng: coords?.lng || null
          };
        })
      }));
    }
    
    // Geocode missing locations (airports, stations, etc.) - limit to first 10 to avoid rate limits
    const geocodePromises = locationsToGeocode.slice(0, 10).map(async ({ dayIdx, actIdx, location }) => {
      // Add city context for better results
      const searchQuery = location.toLowerCase().includes(destinationCity.toLowerCase()) 
        ? location 
        : `${location}, ${destinationCity}`;
      
      const coords = await geocodeLocation(searchQuery, destinationLat, destinationLng);
      if (coords) {
        itinerary.days[dayIdx].activities[actIdx].lat = coords.lat;
        itinerary.days[dayIdx].activities[actIdx].lng = coords.lng;
        // Cache this for similar locations
        locationMap[location.toLowerCase()] = coords;
      }
      return coords;
    });
    
    await Promise.all(geocodePromises);
    
    // Second pass: Apply cached geocoded locations to remaining activities
    if (locationsToGeocode.length > 10) {
      for (let i = 10; i < locationsToGeocode.length; i++) {
        const { dayIdx, actIdx, location } = locationsToGeocode[i];
        const locationLower = location.toLowerCase();
        if (locationMap[locationLower]) {
          itinerary.days[dayIdx].activities[actIdx].lat = locationMap[locationLower].lat;
          itinerary.days[dayIdx].activities[actIdx].lng = locationMap[locationLower].lng;
        }
      }
    }
    
    console.log("Generated optimized itinerary with coords:", JSON.stringify(itinerary, null, 2));

    return new Response(JSON.stringify(itinerary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error generating itinerary:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
