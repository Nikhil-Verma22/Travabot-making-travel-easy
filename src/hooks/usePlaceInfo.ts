import { useQuery } from "@tanstack/react-query";
import { supabase } from '@/integrations/supabase/client';

export type PlaceInfo = {
  title: string;
  description: string;
  imageUrl: string | null;
  wikiUrl: string | null;
  source: "summary" | "search";
};

// Local place descriptions (fallback)
const LOCAL_PLACE_INFO: Record<string, PlaceInfo> = {
  'hawa mahal': {
    title: 'Hawa Mahal',
    description: 'The Hawa Mahal (Palace of Winds) is a palace in Jaipur, India. Built in 1799 by Maharaja Sawai Pratap Singh, it is constructed of red and pink sandstone. The palace sits on the edge of the City Palace and extends to the Zenana, or women\'s chambers. Its unique five-story exterior resembles a honeycomb with 953 small windows called jharokhas decorated with intricate latticework.',
    imageUrl: 'https://images.unsplash.com/photo-1599661046289-e31897846e41',
    wikiUrl: 'https://en.wikipedia.org/wiki/Hawa_Mahal',
    source: 'search',
  },
  'amber fort': {
    title: 'Amber Fort',
    description: 'Amber Fort is a fort located in Amer, Rajasthan, India. Amer is a town with an area of 4 square kilometres located 11 kilometres from Jaipur. Located high on a hill, it is the principal tourist attraction in Jaipur. The fort is known for its artistic Hindu style elements. With its large ramparts and series of gates and cobbled paths, the fort overlooks Maota Lake.',
    imageUrl: 'https://images.unsplash.com/photo-1477587458883-47145ed94245',
    wikiUrl: 'https://en.wikipedia.org/wiki/Amber_Fort',
    source: 'search',
  },
  'city palace': {
    title: 'City Palace, Jaipur',
    description: 'The City Palace, Jaipur is a royal residence and former administrative headquarters of the rulers of the Jaipur State in Jaipur, Rajasthan. Construction started soon after the establishment of the city of Jaipur under the reign of Maharaja Sawai Jai Singh II. It is a remarkable blend of Mughal and Rajput architecture.',
    imageUrl: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da',
    wikiUrl: 'https://en.wikipedia.org/wiki/City_Palace,_Jaipur',
    source: 'search',
  },
  'gateway of india': {
    title: 'Gateway of India',
    description: 'The Gateway of India is an arch-monument built in the early 20th century in Mumbai, India. It was erected to commemorate the landing of King-Emperor George V and Queen-Empress Mary at Apollo Bunder on their visit to India in 1911. Built in the Indo-Saracenic style, the foundation stone was laid on 31 March 1911.',
    imageUrl: 'https://images.unsplash.com/photo-1566552881560-0be862a7c445',
    wikiUrl: 'https://en.wikipedia.org/wiki/Gateway_of_India',
    source: 'search',
  },
  'red fort': {
    title: 'Red Fort',
    description: 'The Red Fort is a historic fort in Old Delhi, Delhi, India, that served as the main residence of the Mughal emperors. Emperor Shah Jahan commissioned construction of the Red Fort on 12 May 1638, when he decided to shift his capital from Agra to Delhi. It is a UNESCO World Heritage Site.',
    imageUrl: 'https://images.unsplash.com/photo-1587474260584-136574528ed5',
    wikiUrl: 'https://en.wikipedia.org/wiki/Red_Fort',
    source: 'search',
  },
  'taj mahal': {
    title: 'Taj Mahal',
    description: 'The Taj Mahal is an ivory-white marble mausoleum on the right bank of the river Yamuna in Agra, Uttar Pradesh, India. It was commissioned in 1631 by the fifth Mughal emperor, Shah Jahan to house the tomb of his beloved wife, Mumtaz Mahal. It is a UNESCO World Heritage Site and one of the Seven Wonders of the World.',
    imageUrl: 'https://images.unsplash.com/photo-1564507592333-c60657eea523',
    wikiUrl: 'https://en.wikipedia.org/wiki/Taj_Mahal',
    source: 'search',
  },
};

function getLocalPlaceInfo(placeName: string): PlaceInfo {
  const normalized = placeName.toLowerCase().trim();
  return LOCAL_PLACE_INFO[normalized] || {
    title: placeName,
    description: `${placeName} is a notable location worth visiting. This destination offers unique experiences and cultural insights for travelers.`,
    imageUrl: 'https://images.unsplash.com/photo-1477587458883-47145ed94245',
    wikiUrl: null,
    source: 'search',
  };
}

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
      console.log('🔄 Fetching place info for', placeName, 'in', city);

      try {
        // Try edge function first
        const { data, error: fetchError } = await supabase.functions.invoke('get-place-info', {
          body: { 
            placeName,
            city
          },
        });

        if (fetchError) throw fetchError;

        const placeInfo: PlaceInfo = data;
        
        // If edge function returns valid data, use it
        if (placeInfo && placeInfo.title) {
          console.log('✅ Got place info from edge function for', placeInfo.title);
          return placeInfo;
        } else {
          throw new Error('No place info returned');
        }
      } catch (err) {
        // Fallback to local place info
        console.warn('Edge function failed, using local place info:', err);
        const fallbackInfo = getLocalPlaceInfo(placeName || 'Unknown Place');
        console.log('✅ Using local fallback info for', fallbackInfo.title);
        return fallbackInfo;
      }
    },
  });
}
