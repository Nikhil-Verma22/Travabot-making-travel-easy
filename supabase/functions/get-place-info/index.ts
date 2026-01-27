import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type PlaceInfoResponse = {
  success: true;
  title: string;
  description: string;
  imageUrl: string | null;
  wikiUrl: string | null;
  source: "summary" | "search";
} | {
  success: false;
  error: string;
};

function normalizeTitle(title: string) {
  return title.trim().replace(/\s+/g, " ");
}

async function fetchSummary(title: string) {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const res = await fetch(url, {
    headers: {
      // Wikipedia asks for a descriptive UA
      "User-Agent": "TravaBOT/1.0 (travel-planner-app)",
      "Accept": "application/json",
    },
  });

  if (!res.ok) {
    return { ok: false as const, status: res.status, data: null as any };
  }
  const data = await res.json();
  return { ok: true as const, status: res.status, data };
}

async function searchWikipedia(query: string) {
  const url = `https://en.wikipedia.org/w/api.php?origin=*&action=query&list=search&format=json&srlimit=1&srsearch=${encodeURIComponent(
    query,
  )}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "TravaBOT/1.0 (travel-planner-app)",
      "Accept": "application/json",
    },
  });

  if (!res.ok) return null;
  const data = await res.json();
  const top = data?.query?.search?.[0];
  return typeof top?.title === "string" ? top.title : null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { placeName, city } = await req.json();

    if (!placeName || typeof placeName !== "string" || placeName.trim().length < 2) {
      return new Response(
        JSON.stringify({ success: false, error: "placeName is required" } satisfies PlaceInfoResponse),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const normalizedPlace = normalizeTitle(placeName);
    const normalizedCity = typeof city === "string" ? normalizeTitle(city) : "";

    // 1) Try direct summary on place name
    const direct = await fetchSummary(normalizedPlace);
    if (direct.ok && direct.data && !direct.data?.type?.includes?.("disambiguation")) {
      const description = direct.data.extract || "";
      const title = direct.data.title || normalizedPlace;
      const imageUrl = direct.data.thumbnail?.source || null;
      const wikiUrl = direct.data.content_urls?.desktop?.page || null;

      return new Response(
        JSON.stringify({
          success: true,
          title,
          description,
          imageUrl,
          wikiUrl,
          source: "summary",
        } satisfies PlaceInfoResponse),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2) Search fallback (place + city)
    const query = normalizedCity ? `${normalizedPlace} ${normalizedCity}` : normalizedPlace;
    const foundTitle = await searchWikipedia(query);

    if (!foundTitle) {
      return new Response(
        JSON.stringify({ success: false, error: "No Wikipedia result found" } satisfies PlaceInfoResponse),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const summary = await fetchSummary(foundTitle);
    if (!summary.ok || !summary.data) {
      return new Response(
        JSON.stringify({ success: false, error: "Failed to fetch Wikipedia summary" } satisfies PlaceInfoResponse),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const description = summary.data.extract || "";
    const title = summary.data.title || foundTitle;
    const imageUrl = summary.data.thumbnail?.source || null;
    const wikiUrl = summary.data.content_urls?.desktop?.page || null;

    return new Response(
      JSON.stringify({
        success: true,
        title,
        description,
        imageUrl,
        wikiUrl,
        source: "search",
      } satisfies PlaceInfoResponse),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("get-place-info error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: msg } satisfies PlaceInfoResponse),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
