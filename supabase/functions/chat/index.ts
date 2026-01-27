import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TripContext {
  source: string;
  sourceState: string | null;
  destination: string;
  destinationState: string | null;
  startDate: string;
  endDate: string;
  travelers: number;
  duration: number;
}

function buildSystemPrompt(tripContext: TripContext | null): string {
  if (tripContext) {
    const { destination, destinationState, source, startDate, endDate, travelers, duration } = tripContext;
    const location = destinationState ? `${destination}, ${destinationState}` : destination;
    
    return `You are a helpful travel assistant specializing in ${location}, India. 

The user is planning a trip:
- From: ${source}
- To: ${location}
- Dates: ${startDate} to ${endDate} (${duration} days)
- Travelers: ${travelers} ${travelers === 1 ? 'person' : 'people'}

Provide personalized recommendations for:
- Must-visit attractions and hidden gems in ${destination}
- Best local restaurants and cuisines to try
- Practical travel tips (weather, best times to visit, local customs)
- Transportation within ${destination}
- Budget estimates and money-saving tips

Be friendly, concise, and focus on ${destination}-specific information. If asked about other destinations, politely redirect to their planned destination while still being helpful.`;
  }

  return `You are a helpful travel assistant for exploring India. Help users discover amazing destinations, plan trips, and provide travel recommendations. Be friendly, informative, and concise. Cover attractions, restaurants, travel tips, and local experiences.`;
}

// Helper function to get AI configuration
// Supports both Lovable AI Gateway and OpenAI
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
      model: "gpt-4o-mini" // Cost-effective model, change to "gpt-4" for better quality
    };
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, tripContext } = await req.json();
    const aiConfig = getAIConfig();
    
    if (!aiConfig) {
      throw new Error("No AI API key configured. Set either LOVABLE_API_KEY (for Lovable) or OPENAI_API_KEY (for local development) in your edge function secrets.");
    }

    const systemPrompt = buildSystemPrompt(tripContext);

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
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }), 
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }), 
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }), 
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), 
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});