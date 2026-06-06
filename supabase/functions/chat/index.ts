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

// Multi-provider AI configuration - supports free alternatives
function getAIConfig() {
  // Try Hugging Face (Free, no credit card required)
  const HUGGINGFACE_API_KEY = Deno.env.get("HUGGINGFACE_API_KEY");
  if (HUGGINGFACE_API_KEY) {
    return {
      provider: "huggingface",
      apiKey: HUGGINGFACE_API_KEY,
      baseUrl: "https://api-inference.huggingface.co/models/microsoft/DialoGPT-large",
      headers: { "Authorization": `Bearer ${HUGGINGFACE_API_KEY}` },
      model: "microsoft/DialoGPT-large"
    };
  }

  // Try Groq (Free tier available)
  const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
  if (GROQ_API_KEY) {
    return {
      provider: "groq",
      apiKey: GROQ_API_KEY,
      baseUrl: "https://api.groq.com/openai/v1/chat/completions",
      headers: { "Authorization": `Bearer ${GROQ_API_KEY}` },
      model: "llama3-8b-8192"
    };
  }

  // Try Google Gemini (Free tier available) - Default key provided
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || "AIzaSyC4NGR2CWVoSiuIVBEW9eTX4fx3puC3qjU";
  if (GEMINI_API_KEY) {
    return {
      provider: "gemini",
      apiKey: GEMINI_API_KEY,
      baseUrl: `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
      headers: { "Content-Type": "application/json" },
      model: "gemini-pro"
    };
  }

  // Fallback to OpenAI (requires payment)
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  if (OPENAI_API_KEY) {
    return {
      provider: "openai",
      apiKey: OPENAI_API_KEY,
      baseUrl: "https://api.openai.com/v1/chat/completions",
      headers: { "Authorization": `Bearer ${OPENAI_API_KEY}` },
      model: "gpt-4o-mini"
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
      throw new Error("No AI API key configured. Using default Gemini key - should work automatically!");
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