import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CityResult {
  city: string;
  state: string | null;
  lat: number;
  lng: number;
  displayName: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { city, country = "India" } = await req.json();

    if (!city || typeof city !== "string") {
      return new Response(
        JSON.stringify({ error: "City name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client with service role for cache operations
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check cache first
    const { data: cached } = await supabase
      .from("cached_cities")
      .select("city_name, state, lat, lng")
      .ilike("city_name", city)
      .maybeSingle();

    if (cached && cached.lat && cached.lng) {
      console.log(`Cache hit for city: ${city}`);
      return new Response(
        JSON.stringify({
          city: cached.city_name,
          state: cached.state,
          lat: Number(cached.lat),
          lng: Number(cached.lng),
          displayName: `${cached.city_name}${cached.state ? `, ${cached.state}` : ""}, ${country}`,
        } as CityResult),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Query Nominatim API (free, no API key required)
    // Respect rate limit: 1 request per second
    const searchQuery = `${city}, ${country}`;
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=5&addressdetails=1`;
    
    console.log(`Fetching from Nominatim: ${searchQuery}`);
    
    const nominatimResponse = await fetch(nominatimUrl, {
      headers: {
        "User-Agent": "TravaBOT/1.0 (https://github.com/Team-Intellectus)", // Required by Nominatim
      },
    });

    if (!nominatimResponse.ok) {
      throw new Error(`Nominatim API error: ${nominatimResponse.status}`);
    }

    const results = await nominatimResponse.json();

    if (!results || results.length === 0) {
      return new Response(
        JSON.stringify({ error: "City not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find the best match (prefer city/town over other place types)
    const bestMatch = results.find((r: any) => 
      r.type === "city" || r.type === "town" || r.type === "village" || r.class === "place"
    ) || results[0];

    const address = bestMatch.address || {};
    const cityName = address.city || address.town || address.village || address.county || city;
    const stateName = address.state || null;
    const lat = parseFloat(bestMatch.lat);
    const lng = parseFloat(bestMatch.lon);

    // Cache the result
    const { error: cacheError } = await supabase
      .from("cached_cities")
      .upsert({
        city_name: cityName,
        state: stateName,
        lat,
        lng,
        fetched_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      }, {
        onConflict: "city_name,state",
      });

    if (cacheError) {
      console.warn("Failed to cache city data:", cacheError);
    }

    const result: CityResult = {
      city: cityName,
      state: stateName,
      lat,
      lng,
      displayName: bestMatch.display_name,
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Geocode error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
