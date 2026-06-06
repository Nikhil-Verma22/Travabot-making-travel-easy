import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plane, Train, Car, Bus, Building2, Star, Check, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useTrip } from "@/context/TripContext";
import { usePOIs } from "@/hooks/usePOIs";
import { useTransport } from "@/hooks/useTransport";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { CacheStatus } from "@/components/CacheStatus";

const getTransportIcon = (type: string) => {
  switch (type) {
    case 'Flight': return Plane;
    case 'Train': return Train;
    case 'Bus': return Bus;
    case 'Car': return Car;
    default: return Car;
  }
};

const Book = () => {
  const navigate = useNavigate();
  const { trip, isConfigured, duration } = useTrip();
  const [selectedArrivalTransport, setSelectedArrivalTransport] = useState<number | null>(null);
  const [selectedReturnTransport, setSelectedReturnTransport] = useState<number | null>(null);
  const [selectedHotel, setSelectedHotel] = useState<number | null>(null);

  // Fetch transport options with caching
  const { options: arrivalTransportOptions, isLoading: arrivalLoading } = useTransport({
    sourceCity: trip?.source?.city || '',
    sourceState: trip?.source?.state || null,
    destinationCity: trip?.destination?.city || '',
    destinationState: trip?.destination?.state || null,
    date: trip?.startDate ? format(trip.startDate, 'yyyy-MM-dd') : '',
    travelers: trip?.travelers || 1,
    type: 'arrival'
  });

  const { options: returnTransportOptions, isLoading: returnLoading } = useTransport({
    sourceCity: trip?.destination?.city || '',
    sourceState: trip?.destination?.state || null,
    destinationCity: trip?.source?.city || '',
    destinationState: trip?.source?.state || null,
    date: trip?.endDate ? format(trip.endDate, 'yyyy-MM-dd') : '',
    travelers: trip?.travelers || 1,
    type: 'return'
  });

  // Fetch hotels with debugging
  const { hotels, isLoading: hotelsLoading, error: hotelsError, refetch: refetchHotels } = usePOIs({
    lat: isConfigured ? (trip?.destination?.lat || null) : null,
    lng: isConfigured ? (trip?.destination?.lng || null) : null,
    cityName: trip?.destination?.city || '',
    includeHotels: true,
    forceRefresh: false // Set to true to bypass cache for debugging
  });

  // Debug logging
  useEffect(() => {
    console.log('Hotels debug:', {
      hotelsCount: hotels.length,
      isLoading: hotelsLoading,
      error: hotelsError,
      destination: trip?.destination,
      isConfigured
    });
  }, [hotels, hotelsLoading, hotelsError, trip?.destination, isConfigured]);

  // Fallback hotels if none are found
  const fallbackHotels = [
    {
      id: 'fallback-1',
      name: 'Heritage Palace Hotel',
      category: 'Heritage Hotel',
      rating: 4.5,
      price: 4500,
      tags: ['Heritage', 'Palace', 'Luxury'],
      image: 'https://placehold.co/400x300/0891b2/ffffff?text=Heritage+Hotel',
      lat: trip?.destination?.lat || 0,
      lng: trip?.destination?.lng || 0,
      type: 'hotel' as const,
      priceLevel: 4
    },
    {
      id: 'fallback-2',
      name: 'Royal Comfort Inn',
      category: 'Business Hotel',
      rating: 4.2,
      price: 3200,
      tags: ['Business', 'Comfort', 'Modern'],
      image: 'https://placehold.co/400x300/0891b2/ffffff?text=Business+Hotel',
      lat: trip?.destination?.lat || 0,
      lng: trip?.destination?.lng || 0,
      type: 'hotel' as const,
      priceLevel: 3
    },
    {
      id: 'fallback-3',
      name: 'City Center Lodge',
      category: 'Budget Hotel',
      rating: 3.8,
      price: 2100,
      tags: ['Budget', 'Central', 'Clean'],
      image: 'https://placehold.co/400x300/0891b2/ffffff?text=Budget+Hotel',
      lat: trip?.destination?.lat || 0,
      lng: trip?.destination?.lng || 0,
      type: 'hotel' as const,
      priceLevel: 2
    }
  ];

  // Always show hotels: real hotels if available, otherwise fallback hotels
  const displayHotels = hotels.length > 0 ? hotels : (!hotelsLoading ? fallbackHotels : []);

  // Auto-select first options when loaded
  useEffect(() => {
    if (arrivalTransportOptions.length > 0 && selectedArrivalTransport === null) {
      setSelectedArrivalTransport(arrivalTransportOptions[0].id);
    }
  }, [arrivalTransportOptions, selectedArrivalTransport]);

  useEffect(() => {
    if (returnTransportOptions.length > 0 && selectedReturnTransport === null) {
      setSelectedReturnTransport(returnTransportOptions[0].id);
    }
  }, [returnTransportOptions, selectedReturnTransport]);

  useEffect(() => {
    if (displayHotels.length > 0 && selectedHotel === null) {
      setSelectedHotel(0);
    }
  }, [displayHotels, selectedHotel]);

  // Redirect if no trip configured
  useEffect(() => {
    if (!isConfigured) {
      navigate('/');
    }
  }, [isConfigured, navigate]);

  if (!trip || !isConfigured) {
    return null;
  }

  const arrivalTransport = arrivalTransportOptions.find((t) => t.id === selectedArrivalTransport);
  const returnTransport = returnTransportOptions.find((t) => t.id === selectedReturnTransport);
  const hotel = selectedHotel !== null ? displayHotels[selectedHotel] : null;
  
  const nights = duration > 0 ? duration - 1 : 0;
  const hotelPrice = hotel ? (hotel.price || 5000) * nights : 0;
  const totalPrice = 
    (arrivalTransport?.price || 0) * (trip.travelers || 1) + 
    (returnTransport?.price || 0) * (trip.travelers || 1) + 
    hotelPrice;

  const formatDateRange = () => {
    if (!trip.startDate || !trip.endDate) return '';
    return `${format(trip.startDate, 'MMM d')}-${format(trip.endDate, 'd, yyyy')}`;
  };

  const handleProceed = () => {
    // Store selections in localStorage for itinerary page
    const selections = {
      arrivalTransport,
      returnTransport,
      hotel: hotel ? { name: hotel.name, price: hotelPrice } : null,
      totalPrice
    };
    localStorage.setItem('travabot_selections', JSON.stringify(selections));
    navigate('/itinerary');
  };

  const TransportSkeleton = () => (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="p-4 bg-card/50 border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Skeleton className="w-12 h-12 rounded-lg" />
              <div>
                <Skeleton className="h-5 w-32 mb-2" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <Skeleton className="h-6 w-20" />
          </div>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Trip Summary */}
        <Card className="p-6 bg-card/50 border-border mb-8 backdrop-blur-sm shadow-card">
          <h2 className="text-2xl font-bold mb-4 gradient-text">Trip Summary</h2>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="p-3 bg-background/50 rounded-lg border border-border">
              <p className="text-sm text-muted-foreground">Destination</p>
              <p className="font-semibold">{trip.destination.city}{trip.destination.state ? `, ${trip.destination.state}` : ''}</p>
            </div>
            <div className="p-3 bg-background/50 rounded-lg border border-border">
              <p className="text-sm text-muted-foreground">Dates</p>
              <p className="font-semibold">{formatDateRange()}</p>
            </div>
            <div className="p-3 bg-background/50 rounded-lg border border-border">
              <p className="text-sm text-muted-foreground">Travelers</p>
              <p className="font-semibold">{trip.travelers} {trip.travelers === 1 ? 'Person' : 'People'}</p>
            </div>
            <div className="p-3 bg-background/50 rounded-lg border border-border">
              <p className="text-sm text-muted-foreground">Duration</p>
              <p className="font-semibold">{duration} Days, {nights} Nights</p>
            </div>
          </div>
        </Card>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Arrival Transportation */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold gradient-text">
                  Select Transportation (Arrival Journey)
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    {trip.source.city} → {trip.destination.city}
                  </span>
                </h2>
                <CacheStatus 
                  isLoading={arrivalLoading} 
                  isCached={false} 
                  className="text-xs"
                />
              </div>
              {arrivalLoading ? (
                <TransportSkeleton />
              ) : arrivalTransportOptions.length === 0 ? (
                <Card className="p-6 bg-card/50 border-border text-center">
                  <p className="text-muted-foreground">No transport options available</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {arrivalTransportOptions.map((option) => {
                    const Icon = getTransportIcon(option.type);
                    return (
                      <Card
                        key={option.id}
                        className={`p-4 cursor-pointer transition-all duration-300 ${
                          selectedArrivalTransport === option.id
                            ? "bg-primary/10 border-primary shadow-glow"
                            : "bg-card/50 border-border hover:shadow-lg hover:border-primary/30"
                        }`}
                        onClick={() => setSelectedArrivalTransport(option.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-background/50 flex items-center justify-center border border-border">
                              <Icon className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold">{option.name}</p>
                                {selectedArrivalTransport === option.id && (
                                  <Check className="w-4 h-4 text-primary" />
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">{option.details}</p>
                              <p className="text-sm text-muted-foreground">
                                {option.departureTime} → {option.arrivalTime} ({option.duration})
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-primary">₹{option.price.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">per person</p>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Return Transportation */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold gradient-text">
                  Select Transportation (Return Journey)
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    {trip.destination.city} → {trip.source.city}
                  </span>
                </h2>
                <CacheStatus 
                  isLoading={returnLoading} 
                  isCached={false} 
                  className="text-xs"
                />
              </div>
              {returnLoading ? (
                <TransportSkeleton />
              ) : returnTransportOptions.length === 0 ? (
                <Card className="p-6 bg-card/50 border-border text-center">
                  <p className="text-muted-foreground">No transport options available</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {returnTransportOptions.map((option) => {
                    const Icon = getTransportIcon(option.type);
                    return (
                      <Card
                        key={option.id}
                        className={`p-4 cursor-pointer transition-all duration-300 ${
                          selectedReturnTransport === option.id
                            ? "bg-primary/10 border-primary shadow-glow"
                            : "bg-card/50 border-border hover:shadow-lg hover:border-primary/30"
                        }`}
                        onClick={() => setSelectedReturnTransport(option.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-background/50 flex items-center justify-center border border-border">
                              <Icon className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold">{option.name}</p>
                                {selectedReturnTransport === option.id && (
                                  <Check className="w-4 h-4 text-primary" />
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">{option.details}</p>
                              <p className="text-sm text-muted-foreground">
                                {option.departureTime} → {option.arrivalTime} ({option.duration})
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-primary">₹{option.price.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">per person</p>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Hotels */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold gradient-text">Select Hotel ({nights} Nights)</h2>
                <CacheStatus 
                  isLoading={hotelsLoading} 
                  isCached={hotels.length > 0 && displayHotels === hotels} 
                  onRefresh={refetchHotels}
                  className="text-xs"
                />
              </div>
              {hotelsLoading ? (
                <TransportSkeleton />
              ) : displayHotels.length === 0 ? (
                <Card className="p-6 bg-card/50 border-border text-center">
                  <p className="text-muted-foreground">No hotels available</p>
                  {hotelsError && (
                    <p className="text-xs text-red-500 mt-2">Error: {hotelsError}</p>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={refetchHotels}
                    className="mt-3"
                  >
                    Try Again
                  </Button>
                </Card>
              ) : (
                <div className="space-y-3">
                  {displayHotels.slice(0, 5).map((h, index) => (
                    <Card
                      key={index}
                      className={`p-4 cursor-pointer transition-all duration-300 ${
                        selectedHotel === index
                          ? "bg-primary/10 border-primary shadow-glow"
                          : "bg-card/50 border-border hover:shadow-lg hover:border-primary/30"
                      }`}
                      onClick={() => setSelectedHotel(index)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="w-20 h-20 rounded-lg bg-background/50 flex items-center justify-center border border-border">
                            <Building2 className="w-8 h-8 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold">{h.name}</p>
                              {selectedHotel === index && (
                                <Check className="w-4 h-4 text-primary" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{h.category || 'Hotel'}</p>
                            {h.rating && (
                              <div className="flex items-center gap-1 mt-1">
                                <Star className="w-4 h-4 fill-primary text-primary" />
                                <span className="text-sm font-medium">{h.rating}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-primary">
                            ₹{((h.price || 5000) * nights).toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            ₹{(h.price || 5000).toLocaleString()} / night
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Price Summary */}
          <div className="lg:col-span-1">
            <Card className="p-6 bg-card/50 border-border sticky top-24 shadow-card backdrop-blur-sm">
              <h3 className="text-lg font-bold mb-4 gradient-text">Price Summary</h3>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm p-2 bg-background/50 rounded-lg">
                  <span className="text-muted-foreground">Arrival Transport ({trip.travelers} people)</span>
                  <span className="font-medium">
                    {arrivalLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      `₹${((arrivalTransport?.price || 0) * (trip.travelers || 1)).toLocaleString()}`
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm p-2 bg-background/50 rounded-lg">
                  <span className="text-muted-foreground">Return Transport ({trip.travelers} people)</span>
                  <span className="font-medium">
                    {returnLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      `₹${((returnTransport?.price || 0) * (trip.travelers || 1)).toLocaleString()}`
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm p-2 bg-background/50 rounded-lg">
                  <span className="text-muted-foreground">Hotel ({nights} nights)</span>
                  <span className="font-medium">
                    {hotelsLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      `₹${hotelPrice.toLocaleString()}`
                    )}
                  </span>
                </div>
                <div className="border-t border-border pt-3">
                  <div className="flex justify-between">
                    <span className="font-semibold">Total</span>
                    <span className="text-2xl font-bold gradient-text">
                      {arrivalLoading || returnLoading || hotelsLoading ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        `₹${totalPrice.toLocaleString()}`
                      )}
                    </span>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <Button 
                  className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 animate-glow text-white font-semibold"
                  onClick={handleProceed}
                  disabled={arrivalLoading || returnLoading || hotelsLoading}
                >
                  {arrivalLoading || returnLoading || hotelsLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Loading...
                    </>
                  ) : (
                    'Proceed to Itinerary'
                  )}
                </Button>
                <Button variant="outline" className="w-full">
                  Save for Later
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Book;
