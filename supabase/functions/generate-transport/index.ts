import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TransportRequest {
  sourceCity: string;
  sourceState: string | null;
  destinationCity: string;
  destinationState: string | null;
  date: string;
  travelers: number;
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
      model: "gpt-4o-mini"
    };
  }
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sourceCity, sourceState, destinationCity, destinationState, date, travelers } = await req.json() as TransportRequest;
    
    console.log(`Generating transport options from ${sourceCity} to ${destinationCity} on ${date}`);

    const aiConfig = getAIConfig();
    if (!aiConfig) {
      throw new Error("No AI API key configured. Set either LOVABLE_API_KEY or OPENAI_API_KEY in your edge function secrets.");
    }

    const sourceLocation = sourceState ? `${sourceCity}, ${sourceState}` : sourceCity;
    const destLocation = destinationState ? `${destinationCity}, ${destinationState}` : destinationCity;

    const systemPrompt = `You are a travel transport options generator for India. Generate realistic transport options between cities.
    
For each transport type (Flight, Train, Car/Bus), provide:
- Realistic operator names (Indian airlines, Indian Railways trains, bus operators)
- Appropriate timing based on distance
- Realistic prices in INR (Indian Rupees)
- Flight codes, train numbers, or vehicle types

Always return a JSON object with the structure specified in the tool.`;

    const userPrompt = `Generate transport options from ${sourceLocation} to ${destLocation} for ${travelers} travelers on ${date}.

Consider:
- Distance between cities
- Available transport modes (flight if >300km, train, bus/car)
- Peak pricing if weekend
- Realistic travel times

Return 3-5 transport options covering different modes and price points.`;

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
              name: "generate_transport_options",
              description: "Generate transport options between two cities",
              parameters: {
                type: "object",
                properties: {
                  options: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "number" },
                        name: { type: "string", description: "Operator name (e.g., Air India, Indian Railways)" },
                        type: { type: "string", enum: ["Flight", "Train", "Bus", "Car"] },
                        departureTime: { type: "string", description: "Departure time (e.g., 7:30 AM)" },
                        arrivalTime: { type: "string", description: "Arrival time (e.g., 9:15 AM)" },
                        duration: { type: "string", description: "Travel duration (e.g., 1h 45m)" },
                        price: { type: "number", description: "Price per person in INR" },
                        details: { type: "string", description: "Additional details like flight number or train name" }
                      },
                      required: ["id", "name", "type", "departureTime", "arrivalTime", "duration", "price", "details"]
                    }
                  }
                },
                required: ["options"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_transport_options" } }
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

    const transportOptions = JSON.parse(toolCall.function.arguments);
    console.log("Generated transport options:", transportOptions);

    return new Response(JSON.stringify(transportOptions), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error generating transport options:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
