import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface POI {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: string;
  type: "attraction" | "restaurant" | "hotel";
  tags: string[];
  rating?: number;
  image?: string;
  priceLevel?: number;
}

// Generate placeholder image URL with category-specific colors
function getPlaceholderUrl(category: string, type: string): string {
  const colors: Record<string, string> = {
    attraction: "4f46e5",
    museum: "7c3aed",
    historic: "b45309",
    monument: "92400e",
    restaurant: "dc2626",
    cafe: "ea580c",
    fast_food: "f97316",
    hotel: "0891b2",
    guest_house: "0e7490",
  };
  const color = colors[type] || colors[category?.toLowerCase()] || "6b7280";
  const label = encodeURIComponent(category.slice(0, 12));
  return `https://placehold.co/400x300/${color}/ffffff?text=${label}`;
}

// Fetch image from Wikimedia Commons using Wikipedia API
async function fetchWikimediaImage(placeName: string, cityName?: string): Promise<string | null> {
  try {
    // First try direct page summary
    const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(placeName)}`;
    const summaryRes = await fetch(summaryUrl, {
      headers: {
        "User-Agent": "TravaBOT/1.0 (travel-planner-app)",
        "Accept": "application/json",
      },
    });

    if (summaryRes.ok) {
      const data = await summaryRes.json();
      if (data.thumbnail?.source && !data.type?.includes?.("disambiguation")) {
        // Get a larger image by modifying the thumbnail URL
        return data.thumbnail.source.replace(/\/\d+px-/, "/400px-");
      }
    } else {
      await summaryRes.text(); // Consume body
    }

    // Fallback: Search Wikipedia with city context
    const searchQuery = cityName ? `${placeName} ${cityName}` : placeName;
    const searchUrl = `https://en.wikipedia.org/w/api.php?origin=*&action=query&list=search&format=json&srlimit=1&srsearch=${encodeURIComponent(searchQuery)}`;
    const searchRes = await fetch(searchUrl, {
      headers: {
        "User-Agent": "TravaBOT/1.0 (travel-planner-app)",
        "Accept": "application/json",
      },
    });

    if (!searchRes.ok) {
      await searchRes.text();
      return null;
    }

    const searchData = await searchRes.json();
    const foundTitle = searchData?.query?.search?.[0]?.title;
    if (!foundTitle) return null;

    // Fetch summary for the found title
    const foundSummaryRes = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(foundTitle)}`,
      {
        headers: {
          "User-Agent": "TravaBOT/1.0 (travel-planner-app)",
          "Accept": "application/json",
        },
      }
    );

    if (foundSummaryRes.ok) {
      const foundData = await foundSummaryRes.json();
      if (foundData.thumbnail?.source) {
        return foundData.thumbnail.source.replace(/\/\d+px-/, "/400px-");
      }
    } else {
      await foundSummaryRes.text();
    }

    return null;
  } catch (error) {
    console.warn(`Failed to fetch Wikimedia image for ${placeName}:`, error);
    return null;
  }
}

// Batch fetch images for multiple POIs (limit concurrency)
async function enrichPOIsWithImages(pois: POI[], cityName?: string, maxConcurrent = 5): Promise<void> {
  // Fetch Wikimedia images for all attractions (most likely to have Wikipedia articles)
  const attractionsToEnrich = pois.filter(p => p.type === "attraction");
  
  for (let i = 0; i < attractionsToEnrich.length; i += maxConcurrent) {
    const batch = attractionsToEnrich.slice(i, i + maxConcurrent);
    const imagePromises = batch.map(async (poi) => {
      const imageUrl = await fetchWikimediaImage(poi.name, cityName);
      if (imageUrl) {
        poi.image = imageUrl;
      }
    });
    await Promise.all(imagePromises);
  }

  // Also try to fetch images for restaurants (cafes and popular spots may have Wikipedia pages)
  const restaurantsToEnrich = pois.filter(p => p.type === "restaurant");
  for (let i = 0; i < restaurantsToEnrich.length; i += maxConcurrent) {
    const batch = restaurantsToEnrich.slice(i, i + maxConcurrent);
    const imagePromises = batch.map(async (poi) => {
      const imageUrl = await fetchWikimediaImage(poi.name, cityName);
      if (imageUrl) {
        poi.image = imageUrl;
      }
    });
    await Promise.all(imagePromises);
  }

  // Ensure all POIs have a valid image (placeholder if Wikimedia failed)
  pois.forEach(poi => {
    if (!poi.image || !poi.image.startsWith("http")) {
      poi.image = getPlaceholderUrl(poi.category, poi.type);
    }
  });
}

// Fetch POIs from Overpass API with retry logic
async function fetchFromOverpass(query: string, retries = 2): Promise<any[]> {
  const servers = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
  ];

  for (let attempt = 0; attempt <= retries; attempt++) {
    const server = servers[attempt % servers.length];
    try {
      const response = await fetch(server, {
        method: "POST",
        body: `data=${encodeURIComponent(query)}`,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      if (response.ok) {
        const data = await response.json();
        return data.elements || [];
      }
    } catch (error) {
      console.warn(`Overpass attempt ${attempt + 1} failed:`, error);
      if (attempt === retries) throw error;
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  return [];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lat, lng, radius = 15000, types = ["attraction", "restaurant", "hotel"], cityName } = await req.json();

    if (!lat || !lng) {
      return new Response(
        JSON.stringify({ error: "lat and lng are required", pois: [] }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Fetching POIs near ${lat}, ${lng} (${cityName || 'unknown city'}) with radius ${radius}m`);

    // Check cache if cityName is provided
    if (cityName) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data: cached } = await supabase
        .from("cached_cities")
        .select("*")
        .ilike("city_name", cityName)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (cached?.attractions && cached?.restaurants) {
        console.log(`Cache hit for ${cityName}`);
        const pois: POI[] = [
          ...(cached.attractions as POI[]).map(p => ({ ...p, type: "attraction" as const })),
          ...(cached.restaurants as POI[]).map(p => ({ ...p, type: "restaurant" as const })),
          ...(cached.hotels ? (cached.hotels as POI[]).map(p => ({ ...p, type: "hotel" as const })) : []),
        ];
        return new Response(
          JSON.stringify({ pois, cached: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const pois: POI[] = [];

    // Fetch attractions
    if (types.includes("attraction")) {
      const query = `
        [out:json][timeout:25];
        (
          node["tourism"="attraction"](around:${radius},${lat},${lng});
          node["tourism"="museum"](around:${radius},${lat},${lng});
          node["historic"](around:${radius},${lat},${lng});
          way["tourism"="attraction"](around:${radius},${lat},${lng});
          way["tourism"="museum"](around:${radius},${lat},${lng});
          way["historic"](around:${radius},${lat},${lng});
        );
        out center 40;
      `;

      try {
        const elements = await fetchFromOverpass(query);
        elements.forEach((el: any, index: number) => {
          const name = el.tags?.name || el.tags?.["name:en"];
          if (!name) return;

          const poiLat = el.lat || el.center?.lat;
          const poiLng = el.lon || el.center?.lon;
          if (!poiLat || !poiLng) return;

          const tags: string[] = [];
          if (el.tags?.historic) tags.push(el.tags.historic);
          if (el.tags?.tourism) tags.push(el.tags.tourism);
          if (el.tags?.building) tags.push(el.tags.building);

          pois.push({
            id: `attraction-${el.id || index}`,
            name,
            lat: poiLat,
            lng: poiLng,
            category: el.tags?.tourism || el.tags?.historic || "Attraction",
            type: "attraction",
            tags: tags.slice(0, 3),
            rating: Math.round((4.0 + Math.random() * 0.9) * 10) / 10,
            image: getPlaceholderUrl(el.tags?.tourism || el.tags?.historic || "Attraction", "attraction"),
          });
        });
      } catch (error) {
        console.error("Error fetching attractions:", error);
      }
    }

    // Fetch restaurants
    if (types.includes("restaurant")) {
      const query = `
        [out:json][timeout:25];
        (
          node["amenity"="restaurant"](around:${radius},${lat},${lng});
          node["amenity"="cafe"](around:${radius},${lat},${lng});
          node["amenity"="fast_food"](around:${radius},${lat},${lng});
        );
        out 40;
      `;

      try {
        const elements = await fetchFromOverpass(query);
        elements.forEach((el: any, index: number) => {
          const name = el.tags?.name || el.tags?.["name:en"];
          if (!name) return;

          const tags: string[] = [];
          if (el.tags?.cuisine) {
            tags.push(...el.tags.cuisine.split(";").slice(0, 2));
          }
          if (el.tags?.amenity) tags.push(el.tags.amenity);

          pois.push({
            id: `restaurant-${el.id || index}`,
            name,
            lat: el.lat,
            lng: el.lon,
            category: el.tags?.amenity === "cafe" ? "Cafe" : "Restaurant",
            type: "restaurant",
            tags: tags.slice(0, 3),
            rating: Math.round((3.8 + Math.random() * 1.1) * 10) / 10,
            image: getPlaceholderUrl(el.tags?.amenity === "cafe" ? "Cafe" : "Restaurant", el.tags?.amenity || "restaurant"),
            priceLevel: Math.ceil(Math.random() * 3),
          });
        });
      } catch (error) {
        console.error("Error fetching restaurants:", error);
      }
    }

    // Fetch hotels
    if (types.includes("hotel")) {
      const query = `
        [out:json][timeout:25];
        (
          node["tourism"="hotel"](around:${radius},${lat},${lng});
          node["tourism"="guest_house"](around:${radius},${lat},${lng});
          way["tourism"="hotel"](around:${radius},${lat},${lng});
        );
        out center 30;
      `;

      try {
        const elements = await fetchFromOverpass(query);
        elements.forEach((el: any, index: number) => {
          const name = el.tags?.name || el.tags?.["name:en"];
          if (!name) return;

          const poiLat = el.lat || el.center?.lat;
          const poiLng = el.lon || el.center?.lon;
          if (!poiLat || !poiLng) return;

          const tags: string[] = [];
          if (el.tags?.stars) tags.push(`${el.tags.stars} Star`);
          if (el.tags?.tourism) tags.push(el.tags.tourism);

          pois.push({
            id: `hotel-${el.id || index}`,
            name,
            lat: poiLat,
            lng: poiLng,
            category: el.tags?.tourism === "guest_house" ? "Guest House" : "Hotel",
            type: "hotel",
            tags: tags.slice(0, 3),
            rating: Math.round((4.0 + Math.random() * 0.8) * 10) / 10,
            image: getPlaceholderUrl(el.tags?.tourism === "guest_house" ? "Guest House" : "Hotel", el.tags?.tourism || "hotel"),
            priceLevel: el.tags?.stars ? parseInt(el.tags.stars) : Math.ceil(Math.random() * 4),
          });
        });
      } catch (error) {
        console.error("Error fetching hotels:", error);
      }
    }

    // Enrich attractions with Wikimedia images
    console.log(`Enriching ${pois.filter(p => p.type === "attraction").length} attractions with Wikimedia images...`);
    await enrichPOIsWithImages(pois, cityName);

    // Cache results if cityName is provided
    if (cityName && pois.length > 0) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        await supabase.from("cached_cities").upsert({
          city_name: cityName,
          lat,
          lng,
          attractions: pois.filter(p => p.type === "attraction"),
          restaurants: pois.filter(p => p.type === "restaurant"),
          hotels: pois.filter(p => p.type === "hotel"),
          fetched_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }, { onConflict: "city_name" });

        console.log(`Cached ${pois.length} POIs for ${cityName}`);
      } catch (cacheError) {
        console.warn("Failed to cache POIs:", cacheError);
      }
    }

    const enrichedCount = pois.filter(p => p.image?.includes("wikipedia") || p.image?.includes("wikimedia")).length;
    console.log(`Found ${pois.length} POIs, ${enrichedCount} with Wikimedia images`);

    return new Response(
      JSON.stringify({ pois, cached: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("POI fetch error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error", pois: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});