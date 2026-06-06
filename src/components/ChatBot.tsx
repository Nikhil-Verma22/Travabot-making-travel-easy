import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, X, Send, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useTrip } from "@/context/TripContext";
import { supabase } from "@/integrations/supabase/client";

type Message = {
  role: "user" | "assistant";
  content: string;
};

// Fallback keyword-based responses
function generateFallbackResponse(message: string, tripContext: any): string {
  const lowerMsg = message.toLowerCase();
  const destination = tripContext?.destination || 'your destination';
  
  // Greetings
  if (lowerMsg.match(/\b(hi|hello|hey|greetings)\b/)) {
    return `Hello! I'm your travel assistant. ${tripContext ? `I can help you plan your trip to ${destination}!` : 'How can I help you plan your trip today?'}`;
  }
  
  // Best time to visit
  if (lowerMsg.match(/\b(best time|when to visit|weather|climate)\b/)) {
    return `The best time to visit ${destination} depends on what you're looking for. Generally, October to March offers pleasant weather for most Indian destinations. Summer (April-June) can be hot, while monsoon (July-September) brings rain but also lush greenery. Would you like specific recommendations for ${destination}?`;
  }
  
  // Attractions
  if (lowerMsg.match(/\b(attractions|places to visit|sightseeing|tourist spots|things to do)\b/)) {
    return `${destination} has many wonderful attractions to explore! I recommend checking out the Explore page where you can find popular tourist spots, historical monuments, and cultural sites. Each attraction comes with detailed information and ratings to help you plan your visit.`;
  }
  
  // Food
  if (lowerMsg.match(/\b(food|restaurant|eat|cuisine|dishes|local food)\b/)) {
    return `${destination} offers amazing local cuisine! You can find great restaurants on the Explore page. I recommend trying local specialties and street food for an authentic experience. Don't miss the traditional dishes that the region is famous for!`;
  }
  
  // Hotels
  if (lowerMsg.match(/\b(hotel|accommodation|stay|where to stay|lodging)\b/)) {
    return `For accommodation in ${destination}, you can browse hotels on the Explore page. Options range from budget-friendly guesthouses to luxury heritage hotels. I recommend booking in advance, especially during peak tourist season.`;
  }
  
  // Transport
  if (lowerMsg.match(/\b(transport|travel|how to reach|getting there|flight|train|bus)\b/)) {
    return `You can reach ${destination} by various means of transport including flights, trains, and buses. Check the Transport page for detailed options with timings and prices. Local transport within the city includes taxis, auto-rickshaws, and app-based cabs.`;
  }
  
  // Budget
  if (lowerMsg.match(/\b(budget|cost|expensive|cheap|price|money)\b/)) {
    return `Travel costs to ${destination} can vary based on your preferences. Budget travelers can manage with ₹2000-3000 per day, mid-range travelers might spend ₹5000-8000 per day, while luxury travel can go upwards of ₹15000 per day. This includes accommodation, food, transport, and attractions.`;
  }
  
  // Duration
  if (lowerMsg.match(/\b(how many days|duration|how long|days needed)\b/)) {
    return `For ${destination}, I'd recommend spending at least 2-3 days to cover the major attractions comfortably. If you want a more relaxed pace and to explore hidden gems, 4-5 days would be ideal. ${tripContext ? `Your current trip is planned for ${tripContext.duration} days.` : ''}`;
  }
  
  // Safety
  if (lowerMsg.match(/\b(safe|safety|secure|dangerous)\b/)) {
    return `${destination} is generally safe for tourists. As with any travel destination, follow basic safety precautions: keep valuables secure, avoid isolated areas at night, use registered taxis, and stay aware of your surroundings. Travel in groups when possible and keep emergency numbers handy.`;
  }
  
  // Shopping
  if (lowerMsg.match(/\b(shopping|market|buy|souvenirs)\b/)) {
    return `${destination} offers great shopping opportunities! Look for local markets, handicraft stores, and specialty shops. Popular items include traditional textiles, handicrafts, jewelry, and local specialties. Don't forget to bargain at local markets!`;
  }
  
  // Default response
  return `I'd love to help you with that! ${tripContext ? `For your trip to ${destination}, ` : ''}I can provide information about attractions, restaurants, hotels, transport, and travel tips. Could you be more specific about what you'd like to know?`;
}

export const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { trip, isConfigured } = useTrip();

  // Build trip context for the AI
  const tripContext = isConfigured && trip ? {
    source: trip.source.city,
    sourceState: trip.source.state,
    destination: trip.destination.city,
    destinationState: trip.destination.state,
    startDate: trip.startDate.toISOString().split('T')[0],
    endDate: trip.endDate.toISOString().split('T')[0],
    travelers: trip.travelers,
    duration: Math.ceil((trip.endDate.getTime() - trip.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1,
  } : null;

  const destinationName = trip?.destination?.city || "your destination";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      console.log('🔄 Sending message to AI chatbot');

      // Try edge function first
      const { data, error: chatError } = await supabase.functions.invoke('chat', {
        body: { 
          message: userMessage.content,
          tripContext,
          conversationHistory: messages.slice(-5), // Last 5 messages for context
        },
      });

      if (chatError) throw chatError;

      const responseText = data?.response;
      
      // If edge function returns valid response, use it
      if (responseText && responseText.trim()) {
        console.log('✅ Got AI response from edge function');
        setMessages(prev => [...prev, { role: "assistant", content: responseText }]);
      } else {
        throw new Error('No response from edge function');
      }
    } catch (error) {
      // Fallback to keyword-based response
      console.warn('Edge function failed, using fallback response:', error);
      const fallbackResponse = generateFallbackResponse(userMessage.content, tripContext);
      setMessages(prev => [...prev, { role: "assistant", content: fallbackResponse }]);
      console.log('✅ Using fallback keyword-based response');
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, tripContext, toast]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 rounded-full w-14 h-14 shadow-lg z-[9999] bg-gradient-to-r from-primary to-accent hover:opacity-90"
          size="icon"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}

      {isOpen && (
        <Card className="fixed bottom-6 right-6 w-96 h-[500px] flex flex-col shadow-2xl z-[9999] border-border">
          <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-primary/10 to-accent/10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Travel Assistant</h3>
                <p className="text-xs text-muted-foreground">
                  {isConfigured ? `Planning for ${destinationName}` : "Ask me anything!"}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-muted-foreground text-sm py-8">
                  <Sparkles className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="font-medium">
                    {isConfigured 
                      ? `Ask me about ${destinationName}!`
                      : "Plan your perfect trip!"}
                  </p>
                  <p className="text-xs mt-2">
                    I can help with attractions, restaurants, travel tips, and more.
                  </p>
                  {isConfigured && (
                    <div className="mt-4 space-y-2">
                      <p className="text-xs font-medium text-primary">Try asking:</p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {[
                          `Best time to visit ${destinationName}?`,
                          "Top attractions",
                          "Local food to try",
                        ].map((suggestion) => (
                          <button
                            key={suggestion}
                            onClick={() => setInput(suggestion)}
                            className="text-xs bg-muted hover:bg-muted/80 px-2 py-1 rounded-full transition-colors"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      msg.role === "user"
                        ? "bg-gradient-to-r from-primary to-accent text-white"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role === "assistant" && 
               messages[messages.length - 1]?.content === "" && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-4 py-2">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={isConfigured ? `Ask about ${destinationName}...` : "Ask me anything..."}
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                size="icon"
                className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}
    </>
  );
};