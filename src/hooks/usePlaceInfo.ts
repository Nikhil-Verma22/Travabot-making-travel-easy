import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PlaceInfo = {
  title: string;
  description: string;
  imageUrl: string | null;
  wikiUrl: string | null;
  source: "summary" | "search";
};

type PlaceInfoSuccess = { success: true } & PlaceInfo;
type PlaceInfoFailure = { success: false; error: string };

export function usePlaceInfo(params: {
  placeName: string | null;
  city?: string | null;
  enabled?: boolean;
}) {
  const { placeName, city, enabled = true } = params;

  return useQuery({
    queryKey: ["place-info", placeName, city],
    enabled: Boolean(enabled && placeName && placeName.trim().length > 1),
    staleTime: 1000 * 60 * 60 * 24, // 24h
    retry: false, // Don't retry on 404s
    queryFn: async (): Promise<PlaceInfo> => {
      const { data, error } = await supabase.functions.invoke("get-place-info", {
        body: { placeName, city },
      });

      // Handle network/invocation errors
      if (error) throw new Error(error.message);

      const payload = data as PlaceInfoSuccess | PlaceInfoFailure | undefined;
      if (!payload) throw new Error("Empty response");
      
      // Handle "not found" as an error that the UI can display gracefully
      if (!payload.success) {
        const failure = payload as PlaceInfoFailure;
        throw new Error(failure.error || "No information available");
      }

      return {
        title: payload.title,
        description: payload.description,
        imageUrl: payload.imageUrl ?? null,
        wikiUrl: payload.wikiUrl ?? null,
        source: payload.source,
      };
    },
  });
}
