import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Search, MapPin, Star, Maximize2, X, Locate, Loader2, Info } from "lucide-react";
import { Link } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ChatBot } from "@/components/ChatBot";
import { useTrip } from "@/context/TripContext";
import { usePOIs, POI } from "@/hooks/usePOIs";
import { PlaceDetailSheet } from "@/components/PlaceDetailSheet";

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Custom colored marker icons
const createColoredIcon = (color: string, isSelected: boolean = false) => {
  const size = isSelected ? 32 : 25;
  const borderWidth = isSelected ? 3 : 2;
  return L.divIcon({
    className: "custom-colored-marker",
    html: `<div style="
      background-color: ${color}; 
      width: ${size}px; 
      height: ${size}px; 
      border-radius: 50% 50% 50% 0; 
      transform: rotate(-45deg);
      border: ${borderWidth}px solid white; 
      box-shadow: 0 2px 8px rgba(0,0,0,0.4)${isSelected ? ', 0 0 12px ' + color : ''};
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
};

const attractionIcon = createColoredIcon("#3b82f6"); // Blue
const restaurantIcon = createColoredIcon("#ef4444"); // Red
const attractionSelectedIcon = createColoredIcon("#3b82f6", true);
const restaurantSelectedIcon = createColoredIcon("#ef4444", true);

const Explore = () => {
  const { trip } = useTrip();
  const destinationLat = trip?.destination?.lat || null;
  const destinationLng = trip?.destination?.lng || null;
  const destinationName = trip?.destination?.city || "your destination";

  const { attractions, restaurants, isLoading, error, isCached, refetch } = usePOIs({
    lat: destinationLat,
    lng: destinationLng,
    radius: 15000,
    cityName: trip?.destination?.city,
  });

  const [selectedPlaces, setSelectedPlaces] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    attractions: true,
    restaurants: true,
  });
  const [showAllOnMap, setShowAllOnMap] = useState(true);
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fullscreenMapRef = useRef<L.Map | null>(null);
  const currentLocationMarkerRef = useRef<L.Marker | null>(null);
  const fullscreenCurrentLocationMarkerRef = useRef<L.Marker | null>(null);
  const [infoPlace, setInfoPlace] = useState<POI | null>(null);


  const locateUser = (map: L.Map, markerRef: React.MutableRefObject<L.Marker | null>) => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        
        if (markerRef.current) {
          markerRef.current.remove();
        }

        const currentLocationIcon = L.divIcon({
          className: "current-location-marker",
          html: `<div style="background-color: #4285F4; width: 20px; height: 20px; border-radius: 50%; border: 4px solid white; box-shadow: 0 0 10px rgba(66, 133, 244, 0.6);"></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });

        markerRef.current = L.marker([latitude, longitude], { icon: currentLocationIcon })
          .addTo(map)
          .bindPopup("<b>Your Location</b>");

        map.setView([latitude, longitude], 14);
      },
      (error) => {
        console.error("Error getting location:", error);
        alert("Unable to retrieve your location. Please check your browser settings.");
      }
    );
  };

  const togglePlace = (placeId: string) => {
    setSelectedPlaces((prev) =>
      prev.includes(placeId) ? prev.filter((id) => id !== placeId) : [...prev, placeId]
    );
  };

  const allPlaces = [...attractions, ...restaurants];
  const selectedPlacesList = allPlaces.filter((p) => selectedPlaces.includes(p.id));

  // Filter places based on search query
  const filteredAttractions = attractions.filter((a) =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredRestaurants = restaurants.filter((r) =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get all places to show on map based on filters and "All" toggle
  const allFilteredPlaces = [
    ...(filters.attractions ? filteredAttractions : []),
    ...(filters.restaurants ? filteredRestaurants : []),
  ];
  
  // If "All" is enabled, show all filtered places; otherwise only selected ones
  const placesToShow = showAllOnMap 
    ? allFilteredPlaces 
    : allFilteredPlaces.filter(p => selectedPlaces.includes(p.id));

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const centerLat = destinationLat || 26.9124;
    const centerLng = destinationLng || 75.7873;

    mapRef.current = L.map(mapContainerRef.current).setView([centerLat, centerLng], 12);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(mapRef.current);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [destinationLat, destinationLng]);

  // Update map center when destination changes
  useEffect(() => {
    if (mapRef.current && destinationLat && destinationLng) {
      mapRef.current.setView([destinationLat, destinationLng], 12);
    }
  }, [destinationLat, destinationLng]);

  // Function to create rich popup content with View Details button
  const createPopupContent = (place: POI, address?: string) => {
    const imageUrl = getPlaceImageUrl(place);
    const streetText = address || "Loading address...";
    
    return `
      <div style="width: 220px; font-family: system-ui, sans-serif;" data-place-id="${place.id}">
        <img 
          src="${imageUrl}" 
          alt="${place.name}" 
          style="width: 100%; height: 120px; object-fit: cover; border-radius: 8px; margin-bottom: 8px;"
          onerror="this.src='/placeholder.svg'"
        />
        <div style="padding: 0 4px;">
          <h3 style="margin: 0 0 4px; font-size: 14px; font-weight: 600; color: #fff;">${place.name}</h3>
          <p style="margin: 0 0 6px; font-size: 12px; color: #a1a1aa;">${place.category}</p>
          <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 6px;">
            <span style="color: #facc15;">★</span>
            <span style="font-size: 13px; color: #fff; font-weight: 500;">${place.rating || "N/A"}</span>
            <span style="font-size: 11px; color: #71717a; margin-left: 4px;">Google Rating</span>
          </div>
          <div style="display: flex; align-items: flex-start; gap: 6px; padding-top: 6px; border-top: 1px solid #3f3f46;">
            <span style="color: #a1a1aa; font-size: 12px;">📍</span>
            <span style="font-size: 11px; color: #a1a1aa; line-height: 1.4;" id="address-${place.id}">${streetText}</span>
          </div>
          <button 
            class="view-details-btn" 
            data-place-id="${place.id}"
            style="width: 100%; margin-top: 10px; padding: 8px 12px; background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent))); color: white; border: none; border-radius: 6px; font-size: 12px; font-weight: 500; cursor: pointer; transition: opacity 0.2s;"
            onmouseover="this.style.opacity='0.9'"
            onmouseout="this.style.opacity='1'"
          >
            View Details
          </button>
        </div>
      </div>
    `;
  };

  // Fetch address via reverse geocoding
  const fetchAddress = async (lat: number, lng: number): Promise<string> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await response.json();
      if (data.address) {
        const parts = [];
        if (data.address.road) parts.push(data.address.road);
        if (data.address.neighbourhood) parts.push(data.address.neighbourhood);
        if (data.address.suburb) parts.push(data.address.suburb);
        if (data.address.city || data.address.town || data.address.village) {
          parts.push(data.address.city || data.address.town || data.address.village);
        }
        return parts.slice(0, 3).join(", ") || "Address not found";
      }
      return "Address not found";
    } catch (error) {
      console.error("Error fetching address:", error);
      return "Address unavailable";
    }
  };

  // Handler for "View Details" button click in popup
  const handleViewDetailsClick = (placeId: string) => {
    const place = allPlaces.find((p) => p.id === placeId);
    if (place) {
      setInfoPlace(place);
    }
  };

  // Global click handler for popup buttons
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains("view-details-btn")) {
        const placeId = target.getAttribute("data-place-id");
        if (placeId) {
          handleViewDetailsClick(placeId);
        }
      }
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [allPlaces]);


  // Update markers when places or selections change
  useEffect(() => {
    if (!mapRef.current) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    const centerLat = destinationLat || 26.9124;
    const centerLng = destinationLng || 75.7873;

    if (placesToShow.length === 0) {
      mapRef.current.setView([centerLat, centerLng], 12);
      return;
    }

    placesToShow.forEach((place) => {
      const isAttraction = place.type === "attraction" || attractions.some(a => a.id === place.id);
      const isSelected = selectedPlaces.includes(place.id);
      
      // Choose icon based on type and selection state
      let icon;
      if (isAttraction) {
        icon = isSelected ? attractionSelectedIcon : attractionIcon;
      } else {
        icon = isSelected ? restaurantSelectedIcon : restaurantIcon;
      }

      const popup = L.popup({ maxWidth: 250, className: "custom-popup" });
      popup.setContent(createPopupContent(place));

      const marker = L.marker([place.lat, place.lng], { icon })
        .addTo(mapRef.current!)
        .bindPopup(popup);

      // Fetch address when popup opens
      marker.on("popupopen", async () => {
        const address = await fetchAddress(place.lat, place.lng);
        const addressEl = document.getElementById(`address-${place.id}`);
        if (addressEl) {
          addressEl.textContent = address;
        }
        // Update popup content with fetched address
        popup.setContent(createPopupContent(place, address));
      });

      markersRef.current.push(marker);
    });

    // Fit bounds to show all markers
    if (placesToShow.length > 1) {
      const bounds = L.latLngBounds(
        placesToShow.map((place) => [place.lat, place.lng])
      );
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    } else if (placesToShow.length === 1) {
      mapRef.current.setView([placesToShow[0].lat, placesToShow[0].lng], 14);
    }
  }, [placesToShow, selectedPlaces, destinationLat, destinationLng, attractions]);

  // Initialize fullscreen map
  useEffect(() => {
    if (isFullscreen) {
      setTimeout(() => {
        const fullscreenContainer = document.getElementById('fullscreen-map');
        if (fullscreenContainer && !fullscreenMapRef.current) {
          const centerLat = destinationLat || 26.9124;
          const centerLng = destinationLng || 75.7873;

          fullscreenMapRef.current = L.map('fullscreen-map').setView([centerLat, centerLng], 12);

          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          }).addTo(fullscreenMapRef.current);

          placesToShow.forEach((place) => {
            const isAttraction = place.type === "attraction" || attractions.some(a => a.id === place.id);
            const isSelected = selectedPlaces.includes(place.id);
            
            let icon;
            if (isAttraction) {
              icon = isSelected ? attractionSelectedIcon : attractionIcon;
            } else {
              icon = isSelected ? restaurantSelectedIcon : restaurantIcon;
            }

            const popup = L.popup({ maxWidth: 250, className: "custom-popup" });
            popup.setContent(createPopupContent(place));

            const marker = L.marker([place.lat, place.lng], { icon })
              .addTo(fullscreenMapRef.current!)
              .bindPopup(popup);

            // Fetch address when popup opens
            marker.on("popupopen", async () => {
              const address = await fetchAddress(place.lat, place.lng);
              popup.setContent(createPopupContent(place, address));
            });
          });

          if (placesToShow.length > 1) {
            const bounds = L.latLngBounds(
              placesToShow.map((place) => [place.lat, place.lng])
            );
            fullscreenMapRef.current.fitBounds(bounds, { padding: [50, 50] });
          } else if (placesToShow.length === 1) {
            fullscreenMapRef.current.setView([placesToShow[0].lat, placesToShow[0].lng], 14);
          }
        }
      }, 100);
    } else {
      if (fullscreenMapRef.current) {
        fullscreenMapRef.current.remove();
        fullscreenMapRef.current = null;
      }
    }
  }, [isFullscreen, placesToShow, selectedPlaces, destinationLat, destinationLng, attractions]);


  // Get place image - prefer API image, fallback to placeholder
  const getPlaceImageUrl = (place: POI) => {
    // Use the image from API if available and valid
    if (place.image && place.image.startsWith("http")) {
      return place.image;
    }
    // Fallback to placeholder with category-based colors
    const colors: Record<string, string> = {
      attraction: "4f46e5",
      museum: "7c3aed",
      historic: "b45309",
      restaurant: "dc2626",
      cafe: "ea580c",
      hotel: "0891b2",
    };
    const color = colors[place.type] || colors[place.category?.toLowerCase()] || "6b7280";
    return `https://placehold.co/400x300/${color}/ffffff?text=${encodeURIComponent(place.name.slice(0, 15))}`;
  };

  const PlaceCard = ({ place, showInfoButton = true }: { place: POI; showInfoButton?: boolean }) => (
    <Card
      className={`overflow-hidden cursor-pointer transition-all duration-300 ${
        selectedPlaces.includes(place.id)
          ? "bg-primary/10 border-primary shadow-glow"
          : "bg-card border-border hover:shadow-lg"
      }`}
    >
      <img 
        src={getPlaceImageUrl(place)} 
        alt={place.name}
        className="w-full h-32 object-cover"
        onError={(e) => {
          (e.target as HTMLImageElement).src = "/placeholder.svg";
        }}
      />
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <p className="font-medium text-sm truncate flex-1">{place.name}</p>
              {showInfoButton && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  title="About this place"
                  onClick={(e) => {
                    e.stopPropagation();
                    setInfoPlace(place);
                  }}
                >
                  <Info className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">{place.category}</p>
            <div className="flex items-center gap-1 mt-1">
              <Star className="w-3 h-3 fill-primary text-primary" />
              <span className="text-xs text-muted-foreground">{place.rating}</span>
            </div>
            {place.tags.length > 0 && (
              <div className="flex gap-1 mt-1 flex-wrap">
                {place.tags.slice(0, 2).map((tag, idx) => (
                  <span key={`${place.id}-${tag}-${idx}`} className="text-xs bg-muted px-1.5 py-0.5 rounded capitalize">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          <Switch
            checked={selectedPlaces.includes(place.id)}
            onCheckedChange={() => togglePlace(place.id)}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </div>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <ChatBot />
      <div className="flex h-[calc(100vh-80px)]">
        {/* Left Sidebar */}
        <div className="w-80 border-r border-border overflow-y-auto bg-card/30 backdrop-blur-sm">
          <div className="p-6 space-y-6">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search places..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background/50 border-border"
              />
            </div>

            {/* Filters */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Filters</h3>
              <div className="space-y-2">
                {Object.entries(filters).map(([key, value]) => (
                  <label key={key} className="flex items-center justify-between cursor-pointer p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <span className="text-sm capitalize">{key}</span>
                    <Switch
                      checked={value}
                      onCheckedChange={(checked) => setFilters({ ...filters, [key]: checked })}
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="ml-2 text-sm text-muted-foreground">Loading places...</span>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">{error}</p>
                <Button variant="outline" size="sm" onClick={refetch} className="mt-2">
                  Retry
                </Button>
              </div>
            )}

            {/* No destination selected */}
            {!destinationLat && !isLoading && (
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <MapPin className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Please select a destination on the home page first
                </p>
                <Link to="/">
                  <Button variant="outline" size="sm" className="mt-2">
                    Go to Home
                  </Button>
                </Link>
              </div>
            )}

            {/* Places List */}
            {!isLoading && !error && destinationLat && (
              <div className="space-y-4">
                {filters.attractions && filteredAttractions.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3 text-sm flex items-center gap-2">
                      <span className="text-primary">●</span> Attractions ({filteredAttractions.length})
                    </h3>
                    <div className="space-y-2">
                      {filteredAttractions.map((place) => (
                        <PlaceCard key={place.id} place={place} />
                      ))}
                    </div>
                  </div>
                )}

                {filters.restaurants && filteredRestaurants.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3 text-sm flex items-center gap-2">
                      <span className="text-accent">●</span> Restaurants ({filteredRestaurants.length})
                    </h3>
                    <div className="space-y-2">
                      {filteredRestaurants.map((place) => (
                        <PlaceCard key={place.id} place={place} />
                      ))}
                    </div>
                  </div>
                )}

                {filteredAttractions.length === 0 && filteredRestaurants.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">No places found for this location</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            <div className="backdrop-blur-sm bg-card/30 p-4 rounded-lg border border-border">
              <h2 className="text-2xl font-bold mb-2 gradient-text">
                Explore {destinationName}
              </h2>
              <p className="text-muted-foreground">
                Select places to add to your trip • {selectedPlaces.length} selected
              </p>
            </div>

            {/* Map */}
            <Card className="overflow-hidden border-border shadow-card relative z-0">
              <div className="p-4 bg-card/50 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Interactive Map</h3>
                  <p className="text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Attractions</span>
                    <span className="mx-2">•</span>
                    <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Restaurants</span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={showAllOnMap ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowAllOnMap(!showAllOnMap)}
                    className="h-8"
                  >
                    {showAllOnMap ? "All" : "Selected"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => mapRef.current && locateUser(mapRef.current, currentLocationMarkerRef)}
                    className="h-8 w-8"
                    title="Show my location"
                  >
                    <Locate className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsFullscreen(true)}
                    className="h-8 w-8"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div ref={mapContainerRef} className="h-96 w-full bg-[#1a1a1a] relative z-0" />
            </Card>

            {/* Selected Places */}
            {selectedPlaces.length > 0 && (
              <Card className="p-6 bg-card/50 border-border shadow-card backdrop-blur-sm">
                <h3 className="font-semibold mb-4 gradient-text">Selected Places ({selectedPlaces.length})</h3>
                <div className="space-y-3">
                  {selectedPlacesList.map((place) => (
                    <div key={place.id} className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-border hover:border-primary/50 transition-colors">
                      <MapPin className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{place.name}</p>
                        <p className="text-sm text-muted-foreground">{place.category}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="About this place"
                          onClick={() => setInfoPlace(place)}
                        >
                          <Info className="h-4 w-4" />
                        </Button>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-primary text-primary" />
                          <span className="text-sm font-medium">{place.rating}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6">
                  <Link to="/book">
                    <Button className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 animate-glow text-white font-semibold">
                      Continue to Booking
                    </Button>
                  </Link>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Fullscreen Map Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-background">
          <div className="absolute top-4 right-4 z-[1000] flex gap-2">
            <Button
              variant="secondary"
              size="icon"
              onClick={() => fullscreenMapRef.current && locateUser(fullscreenMapRef.current, fullscreenCurrentLocationMarkerRef)}
              className="h-10 w-10 bg-background/90 backdrop-blur-sm"
              title="Show my location"
            >
              <Locate className="w-5 h-5" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={() => setIsFullscreen(false)}
              className="h-10 w-10 bg-background/90 backdrop-blur-sm"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          <div id="fullscreen-map" className="h-full w-full" />
        </div>
      )}

      <PlaceDetailSheet
        place={infoPlace}
        cityName={trip?.destination?.city}
        onClose={() => setInfoPlace(null)}
        getPlaceImageUrl={getPlaceImageUrl}
      />
    </div>
  );
};

export default Explore;
