import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Star, MapPin, ExternalLink, Loader2 } from "lucide-react";
import { POI } from "@/hooks/usePOIs";
import { usePlaceInfo } from "@/hooks/usePlaceInfo";

interface PlaceDetailSheetProps {
  place: POI | null;
  cityName?: string;
  onClose: () => void;
  getPlaceImageUrl: (place: POI) => string;
}

export const PlaceDetailSheet = ({
  place,
  cityName,
  onClose,
  getPlaceImageUrl,
}: PlaceDetailSheetProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [address, setAddress] = useState<string>("Loading address...");
  const [showStreetView, setShowStreetView] = useState(false);

  const { data: placeInfo, isLoading: isPlaceInfoLoading } = usePlaceInfo({
    placeName: place?.name ?? null,
    city: cityName ?? null,
    enabled: Boolean(place),
  });

  // Collect all available images
  const images: string[] = [];
  if (place) {
    const mainImage = getPlaceImageUrl(place);
    if (mainImage) images.push(mainImage);
    if (placeInfo?.imageUrl && !images.includes(placeInfo.imageUrl)) {
      images.push(placeInfo.imageUrl);
    }
  }

  // Fetch address via reverse geocoding
  useEffect(() => {
    if (!place) return;
    setAddress("Loading address...");
    
    const fetchAddress = async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${place.lat}&lon=${place.lng}&zoom=18&addressdetails=1`,
          { headers: { "Accept-Language": "en" } }
        );
        const data = await response.json();
        if (data.address) {
          const parts = [];
          if (data.address.road) parts.push(data.address.road);
          if (data.address.house_number) parts.unshift(data.address.house_number);
          if (data.address.neighbourhood) parts.push(data.address.neighbourhood);
          if (data.address.suburb) parts.push(data.address.suburb);
          if (data.address.city || data.address.town || data.address.village) {
            parts.push(data.address.city || data.address.town || data.address.village);
          }
          if (data.address.postcode) parts.push(data.address.postcode);
          setAddress(parts.join(", ") || "Address not found");
        } else {
          setAddress("Address not found");
        }
      } catch (error) {
        console.error("Error fetching address:", error);
        setAddress("Address unavailable");
      }
    };

    fetchAddress();
  }, [place]);

  // Reset state when place changes
  useEffect(() => {
    setCurrentImageIndex(0);
    setShowStreetView(false);
  }, [place?.id]);

  const nextImage = () => {
    if (showStreetView) {
      setShowStreetView(false);
      setCurrentImageIndex(0);
    } else if (currentImageIndex < images.length - 1) {
      setCurrentImageIndex((prev) => prev + 1);
    } else {
      setShowStreetView(true);
    }
  };

  const prevImage = () => {
    if (showStreetView) {
      setShowStreetView(false);
      setCurrentImageIndex(images.length - 1);
    } else if (currentImageIndex > 0) {
      setCurrentImageIndex((prev) => prev - 1);
    }
  };

  const totalSlides = images.length + 1; // +1 for Street View
  const currentSlide = showStreetView ? images.length : currentImageIndex;

  if (!place) return null;

  const streetViewUrl = `https://www.google.com/maps/embed/v1/streetview?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&location=${place.lat},${place.lng}&heading=0&pitch=0&fov=90`;

  return (
    <Sheet open={Boolean(place)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="h-[70vh] p-0 rounded-t-2xl overflow-hidden z-[100]">
        {/* Image Carousel / Street View */}
        <div className="relative h-48 bg-muted">
          {showStreetView ? (
            <iframe
              src={streetViewUrl}
              className="w-full h-full border-0"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Street View"
            />
          ) : (
            <img
              src={images[currentImageIndex] || "/placeholder.svg"}
              alt={place.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/placeholder.svg";
              }}
            />
          )}

          {/* Navigation Buttons */}
          <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none">
            <Button
              variant="secondary"
              size="icon"
              className="h-9 w-9 rounded-full bg-background/80 backdrop-blur-sm pointer-events-auto"
              onClick={prevImage}
              disabled={currentImageIndex === 0 && !showStreetView}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="h-9 w-9 rounded-full bg-background/80 backdrop-blur-sm pointer-events-auto"
              onClick={nextImage}
              disabled={showStreetView}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {/* Slide Indicators */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {Array.from({ length: totalSlides }).map((_, idx) => (
              <button
                key={idx}
                className={`w-2 h-2 rounded-full transition-all ${
                  idx === currentSlide
                    ? "bg-primary w-4"
                    : "bg-white/60"
                }`}
                onClick={() => {
                  if (idx === images.length) {
                    setShowStreetView(true);
                  } else {
                    setShowStreetView(false);
                    setCurrentImageIndex(idx);
                  }
                }}
              />
            ))}
          </div>

          {/* Slide Label */}
          <div className="absolute bottom-3 right-3 bg-background/80 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium">
            {showStreetView ? "Street View" : `Photo ${currentImageIndex + 1}/${images.length}`}
          </div>
        </div>

        <SheetHeader className="px-4 pt-4 pb-2">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <SheetTitle className="text-lg">{place.name}</SheetTitle>
              <p className="text-sm text-muted-foreground">{place.category}</p>
            </div>
            <div className="flex items-center gap-1 bg-primary/10 px-2 py-1 rounded-full">
              <Star className="w-4 h-4 fill-primary text-primary" />
              <span className="text-sm font-semibold">{place.rating || "N/A"}</span>
            </div>
          </div>
        </SheetHeader>

        {/* Tabs */}
        <Tabs defaultValue="about" className="flex-1">
          <TabsList className="w-full justify-start px-4 bg-transparent border-b border-border rounded-none h-auto pb-0">
            <TabsTrigger
              value="about"
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-2"
            >
              About
            </TabsTrigger>
            <TabsTrigger
              value="photos"
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-2"
            >
              Photos
            </TabsTrigger>
            <TabsTrigger
              value="streetview"
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-2"
            >
              Street View
            </TabsTrigger>
          </TabsList>

          <div className="overflow-y-auto h-[calc(70vh-280px)]">
            <TabsContent value="about" className="p-4 space-y-4 mt-0">
              {/* Address */}
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Address</p>
                  <p className="text-sm text-muted-foreground">{address}</p>
                </div>
              </div>

              {/* Description */}
              {isPlaceInfoLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading info...
                </div>
              ) : placeInfo?.description ? (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">About</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {placeInfo.description}
                  </p>
                  {placeInfo.wikiUrl && (
                    <a
                      href={placeInfo.wikiUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      Read more on Wikipedia
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No additional information available.
                </p>
              )}

              {/* Tags */}
              {place.tags && place.tags.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {place.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-muted px-2 py-1 rounded-full capitalize"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Open in Google Maps */}
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2"
              >
                <Button variant="outline" size="sm">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open in Google Maps
                </Button>
              </a>
            </TabsContent>

            <TabsContent value="photos" className="p-4 mt-0">
              <div className="grid grid-cols-2 gap-2">
                {images.map((img, idx) => (
                  <img
                    key={idx}
                    src={img}
                    alt={`${place.name} photo ${idx + 1}`}
                    className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => {
                      setCurrentImageIndex(idx);
                      setShowStreetView(false);
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/placeholder.svg";
                    }}
                  />
                ))}
                {images.length === 0 && (
                  <p className="col-span-2 text-sm text-muted-foreground text-center py-8">
                    No photos available
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="streetview" className="p-0 mt-0">
              <div className="h-64">
                <iframe
                  src={streetViewUrl}
                  className="w-full h-full border-0"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Street View"
                />
              </div>
              <p className="text-xs text-muted-foreground text-center py-2">
                Powered by Google Street View
              </p>
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};
