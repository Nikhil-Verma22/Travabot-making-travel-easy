import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Calendar, MapPin, Users, Compass, Sparkles, Star, UtensilsCrossed, Clock, Edit2, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTrip, CityInfo } from "@/context/TripContext";
import { CityAutocomplete } from "@/components/CityAutocomplete";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";

const Index = () => {
  const navigate = useNavigate();
  const { trip, setTrip, isConfigured } = useTrip();
  const [isEditing, setIsEditing] = useState(!isConfigured);
  
  // Local state for editing
  const [source, setSource] = useState<CityInfo>(trip?.source || { city: "", state: null, lat: 0, lng: 0 });
  const [destination, setDestination] = useState<CityInfo>(trip?.destination || { city: "", state: null, lat: 0, lng: 0 });
  const [startDate, setStartDate] = useState<Date | undefined>(trip?.startDate);
  const [endDate, setEndDate] = useState<Date | undefined>(trip?.endDate);
  const [travelers, setTravelers] = useState(trip?.travelers || 1);

  const handleSave = () => {
    if (source.city && destination.city && startDate && endDate) {
      setTrip({
        source,
        destination,
        startDate,
        endDate,
        travelers,
      });
      setIsEditing(false);
    }
  };

  const duration = startDate && endDate 
    ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
    : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-accent/5 to-background"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMzYjgyZjYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE2YzAtMy4zMTQgMi42ODYtNiA2LTZzNi0yLjY4NiA2LTYtMi42ODYtNi02LTYtNiAyLjY4Ni02IDYgMi42ODYgNiA2IDZjLTMuMzE0IDAtNiAyLjY4Ni02IDZ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>
        <div className="relative max-w-7xl mx-auto px-6 py-24">
          <div className="text-center space-y-6 max-w-3xl mx-auto">
            <div className="inline-flex items-center space-x-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 animate-pulse">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary font-medium">AI-Powered Planning</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold">
              Plan Your <span className="gradient-text">Perfect Journey</span>
            </h1>
            <p className="text-xl text-muted-foreground">
              Discover amazing destinations with AI-powered personalized recommendations
            </p>
          </div>
        </div>
      </div>

      {/* Journey Planning Section */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <Card className="bg-card/50 border-border backdrop-blur-sm p-8 shadow-card hover:shadow-glow transition-all duration-500">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold gradient-text">Your Journey Details</h2>
            {isConfigured && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                className="gap-2"
              >
                {isEditing ? <Check className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                {isEditing ? "Done" : "Edit"}
              </Button>
            )}
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Source */}
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                From
              </label>
              {isEditing ? (
                <CityAutocomplete
                  value={source.city}
                  onChange={(city) => setSource({ 
                    city: city.city, 
                    state: city.state, 
                    lat: city.lat, 
                    lng: city.lng,
                    displayName: city.displayName
                  })}
                  placeholder="Enter source city"
                />
              ) : (
                <div className="p-4 bg-background/50 rounded-lg border border-border">
                  <p className="font-semibold">{source.city || "Not set"}</p>
                  <p className="text-sm text-muted-foreground">{source.state || "-"}</p>
                </div>
              )}
            </div>

            {/* Destination */}
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground flex items-center gap-2">
                <MapPin className="w-4 h-4 text-accent" />
                To
              </label>
              {isEditing ? (
                <CityAutocomplete
                  value={destination.city}
                  onChange={(city) => setDestination({ 
                    city: city.city, 
                    state: city.state, 
                    lat: city.lat, 
                    lng: city.lng,
                    displayName: city.displayName
                  })}
                  placeholder="Enter destination city"
                />
              ) : (
                <div className="p-4 bg-background/50 rounded-lg border border-border">
                  <p className="font-semibold">{destination.city || "Not set"}</p>
                  <p className="text-sm text-muted-foreground">{destination.state || "-"}</p>
                </div>
              )}
            </div>

            {/* Travel Dates */}
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Travel Dates
              </label>
              {isEditing ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal h-auto py-3">
                      <div>
                        <p className="font-semibold">
                          {startDate && endDate 
                            ? `${format(startDate, "MMM d")} - ${format(endDate, "MMM d, yyyy")}`
                            : "Select dates"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {duration > 0 ? `${duration} days` : "Pick start & end dates"}
                        </p>
                      </div>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="range"
                      selected={{ from: startDate, to: endDate }}
                      onSelect={(range) => {
                        setStartDate(range?.from);
                        setEndDate(range?.to);
                      }}
                      numberOfMonths={2}
                      disabled={{ before: new Date() }}
                    />
                  </PopoverContent>
                </Popover>
              ) : (
                <div className="p-4 bg-background/50 rounded-lg border border-border">
                  <p className="font-semibold">
                    {startDate && endDate 
                      ? `${format(startDate, "MMM d")} - ${format(endDate, "MMM d, yyyy")}`
                      : "Not set"}
                  </p>
                  <p className="text-sm text-muted-foreground">{duration > 0 ? `${duration} days` : "-"}</p>
                </div>
              )}
            </div>

            {/* Travelers */}
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-accent" />
                Travelers
              </label>
              {isEditing ? (
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={travelers}
                  onChange={(e) => setTravelers(Math.max(1, parseInt(e.target.value) || 1))}
                  className="h-auto py-3"
                />
              ) : (
                <div className="p-4 bg-background/50 rounded-lg border border-border">
                  <p className="font-semibold">{travelers} {travelers === 1 ? "Person" : "People"}</p>
                  <p className="text-sm text-muted-foreground">Travelers</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            {isEditing ? (
              <Button 
                size="lg" 
                className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90 animate-glow text-white font-semibold"
                onClick={handleSave}
                disabled={!source.city || !destination.city || !startDate || !endDate}
              >
                <Check className="w-5 h-5 mr-2" />
                Save & Continue
              </Button>
            ) : (
              <>
                <Button 
                  size="lg" 
                  className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90 animate-glow text-white font-semibold"
                  onClick={() => navigate("/explore")}
                  disabled={!isConfigured}
                >
                  <Compass className="w-5 h-5 mr-2" />
                  Plan My Perfect Trip
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setIsEditing(true)}
                >
                  <Calendar className="w-5 h-5 mr-2" />
                  Customize Details
                </Button>
              </>
            )}
          </div>
        </Card>
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: Star, label: "Top Attractions", value: "15+", color: "text-primary" },
            { icon: Sparkles, label: "Unique Activities", value: "8+", color: "text-accent" },
            { icon: UtensilsCrossed, label: "Restaurants", value: "12+", color: "text-primary" },
            { icon: Clock, label: "Support", value: "24/7", color: "text-accent" },
          ].map((feature, index) => (
            <Card key={index} className="bg-card/50 border-border p-6 text-center hover:border-primary/50 hover:shadow-glow transition-all duration-300 group">
              <feature.icon className={`w-12 h-12 mx-auto mb-4 ${feature.color} group-hover:scale-110 transition-transform`} />
              <div className="text-3xl font-bold mb-2 gradient-text">{feature.value}</div>
              <div className="text-muted-foreground">{feature.label}</div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Index;
