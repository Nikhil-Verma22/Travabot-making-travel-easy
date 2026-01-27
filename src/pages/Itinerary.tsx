import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, Share2, ChevronDown, ChevronUp, Plane, Building2, MapPin, UtensilsCrossed, Clock, Map as MapIcon, Locate, ShoppingBag, Camera, Loader2, Check, Copy } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTrip } from "@/context/TripContext";
import { usePOIs } from "@/hooks/usePOIs";
import { useItinerary } from "@/hooks/useItinerary";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { jsPDF } from "jspdf";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Activity {
  time: string;
  type: string;
  title: string;
  description: string;
  location: string;
  lat?: number | null;
  lng?: number | null;
}

interface DayData {
  day: number;
  date: string;
  title: string;
  activities: Activity[];
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'transport': return Plane;
    case 'hotel': return Building2;
    case 'attraction': return MapPin;
    case 'restaurant': return UtensilsCrossed;
    case 'shopping': return ShoppingBag;
    case 'activity': return Camera;
    default: return MapPin;
  }
};

const Itinerary = () => {
  const navigate = useNavigate();
  const { trip, isConfigured, duration } = useTrip();
  const [expandedDays, setExpandedDays] = useState<number[]>([1]);
  const [selectedDayMap, setSelectedDayMap] = useState<number | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const mapRef = useRef<L.Map | null>(null);
  const currentLocationMarkerRef = useRef<L.Marker | null>(null);

  // Get selections from localStorage
  const [selections, setSelections] = useState<any>(null);

  // Fetch POIs for the destination
  const { attractions, restaurants } = usePOIs({
    lat: isConfigured ? (trip?.destination?.lat || null) : null,
    lng: isConfigured ? (trip?.destination?.lng || null) : null,
    cityName: trip?.destination?.city || '',
  });

  // Generate itinerary
  const { days, isLoading, error, generateItinerary } = useItinerary();

  useEffect(() => {
    const stored = localStorage.getItem('travabot_selections');
    if (stored) {
      setSelections(JSON.parse(stored));
    }
  }, []);

  // Generate itinerary when data is ready
  useEffect(() => {
    if (!isConfigured || !trip || days.length > 0) return;
    if (attractions.length === 0 && restaurants.length === 0) return;

    const generate = async () => {
      try {
        // Get hotel with coordinates if available
        const hotel = selections?.hotel;
        const hotelWithCoords = hotel ? {
          name: hotel.name,
          lat: hotel.lat,
          lng: hotel.lng
        } : null;

        await generateItinerary({
          destinationCity: trip.destination.city,
          destinationState: trip.destination.state,
          destinationLat: trip.destination.lat,
          destinationLng: trip.destination.lng,
          startDate: format(trip.startDate, 'yyyy-MM-dd'),
          endDate: format(trip.endDate, 'yyyy-MM-dd'),
          travelers: trip.travelers,
          selectedAttractions: attractions.slice(0, 5).map(a => ({ name: a.name, lat: a.lat, lng: a.lng })),
          selectedRestaurants: restaurants.slice(0, 3).map(r => ({ name: r.name, lat: r.lat, lng: r.lng })),
          selectedHotel: hotelWithCoords,
          transportType: selections?.arrivalTransport?.type || 'Flight'
        });
      } catch (err) {
        console.error('Failed to generate itinerary:', err);
      }
    };

    generate();
  }, [isConfigured, trip, attractions, restaurants, selections, days.length]);

  // Redirect if no trip configured
  useEffect(() => {
    if (!isConfigured) {
      navigate('/');
    }
  }, [isConfigured, navigate]);

  // Leaflet setup
  useEffect(() => {
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
      iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    });
  }, []);

  // Map dialog effect
  useEffect(() => {
    if (selectedDayMap !== null && trip) {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      const dayData = days.find((d) => d.day === selectedDayMap) as DayData | undefined;
      if (!dayData) return;

      const timer = setTimeout(() => {
        const container = document.getElementById(`map-container-${selectedDayMap}`);
        if (!container) return;
        
        try {
          const defaultCenter: [number, number] = [trip.destination.lat, trip.destination.lng];
          
          const map = L.map(container, {
            center: defaultCenter,
            zoom: 13,
            zoomControl: true,
          });

          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
          }).addTo(map);

          // Filter activities with valid coordinates
          const activitiesWithCoords = dayData.activities.filter(
            (a) => a.lat && a.lng && typeof a.lat === 'number' && typeof a.lng === 'number'
          );

          // Add markers for each activity with coordinates
          const markerPositions: [number, number][] = [];
          
          dayData.activities.forEach((activity, idx) => {
            const hasCoords = activity.lat && activity.lng;
            const position: [number, number] = hasCoords 
              ? [activity.lat as number, activity.lng as number]
              : defaultCenter;

            if (hasCoords) {
              markerPositions.push(position);
            }

            const customIcon = L.divIcon({
              className: "custom-marker",
              html: `<div style="background-color: ${hasCoords ? '#EA4335' : '#9CA3AF'}; color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 16px; border: 3px solid white; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);">${idx + 1}</div>`,
              iconSize: [36, 36],
              iconAnchor: [18, 18],
            });

            L.marker(position, { icon: customIcon })
              .addTo(map)
              .bindPopup(`
                <div style="min-width: 180px;">
                  <strong style="color: #EA4335;">Stop ${idx + 1}: ${activity.title}</strong>
                  <br/><span style="color: #666;">${activity.time}</span>
                  <br/><span style="font-size: 12px;">${activity.location}</span>
                </div>
              `);
          });

          // Draw polyline with arrows between locations
          if (markerPositions.length > 1) {
            // Main route polyline
            const polyline = L.polyline(markerPositions, {
              color: '#EA4335',
              weight: 4,
              opacity: 0.8,
              dashArray: '10, 10',
            }).addTo(map);

            // Add arrow decorations between points
            for (let i = 0; i < markerPositions.length - 1; i++) {
              const start = markerPositions[i];
              const end = markerPositions[i + 1];
              
              // Calculate midpoint for arrow
              const midLat = (start[0] + end[0]) / 2;
              const midLng = (start[1] + end[1]) / 2;
              
              // Calculate angle for arrow direction
              const angle = Math.atan2(end[0] - start[0], end[1] - start[1]) * (180 / Math.PI);
              
              // Arrow marker at midpoint
              const arrowIcon = L.divIcon({
                className: 'arrow-icon',
                html: `<div style="
                  transform: rotate(${-angle + 90}deg);
                  color: #EA4335;
                  font-size: 20px;
                  font-weight: bold;
                  text-shadow: 0 0 3px white, 0 0 3px white;
                ">➤</div>`,
                iconSize: [20, 20],
                iconAnchor: [10, 10],
              });

              L.marker([midLat, midLng], { icon: arrowIcon, interactive: false }).addTo(map);
            }

            // Fit map to show all markers
            map.fitBounds(L.latLngBounds(markerPositions), { padding: [50, 50] });
          } else if (markerPositions.length === 1) {
            map.setView(markerPositions[0], 14);
          }

          mapRef.current = map;

          setTimeout(() => {
            map.invalidateSize();
          }, 100);
        } catch (error) {
          console.error("Error initializing map:", error);
        }
      }, 200);

      return () => {
        clearTimeout(timer);
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
      };
    }
  }, [selectedDayMap, days, trip]);

  const toggleDay = (day: number) => {
    setExpandedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleDownloadPdf = async () => {
    if (!trip || days.length === 0) return;
    
    setIsGeneratingPdf(true);
    
    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      let yPosition = margin;
      
      // Helper function to add new page if needed
      const checkPageBreak = (neededHeight: number) => {
        if (yPosition + neededHeight > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
          return true;
        }
        return false;
      };
      
      // Title
      pdf.setFontSize(24);
      pdf.setTextColor(234, 67, 53); // Primary color
      pdf.text(`${trip.destination.city} Itinerary`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 12;
      
      // Subtitle
      pdf.setFontSize(12);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`${formatDateRange()} • ${duration} Days • ${trip.travelers} ${trip.travelers === 1 ? 'Person' : 'People'}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 20;
      
      // Trip Summary Box
      pdf.setFillColor(248, 248, 248);
      pdf.roundedRect(margin, yPosition, pageWidth - 2 * margin, 45, 3, 3, 'F');
      yPosition += 10;
      
      pdf.setFontSize(14);
      pdf.setTextColor(50, 50, 50);
      pdf.text('Trip Summary', margin + 10, yPosition);
      yPosition += 8;
      
      pdf.setFontSize(10);
      pdf.setTextColor(80, 80, 80);
      pdf.text(`Destination: ${trip.destination.city}${trip.destination.state ? `, ${trip.destination.state}` : ''}`, margin + 10, yPosition);
      yPosition += 6;
      pdf.text(`Duration: ${duration} Days, ${nights} Nights`, margin + 10, yPosition);
      yPosition += 6;
      pdf.text(`Travelers: ${trip.travelers} ${trip.travelers === 1 ? 'Person' : 'People'}`, margin + 10, yPosition);
      yPosition += 6;
      
      if (selections?.hotel) {
        pdf.text(`Accommodation: ${selections.hotel.name}`, margin + 10, yPosition);
        yPosition += 6;
      }
      
      pdf.text(`Total Price: ₹${totalPrice.toLocaleString()}`, margin + 10, yPosition);
      yPosition += 20;
      
      // Days
      for (const dayData of days) {
        checkPageBreak(60);
        
        // Day header
        pdf.setFillColor(234, 67, 53);
        pdf.roundedRect(margin, yPosition, pageWidth - 2 * margin, 12, 2, 2, 'F');
        pdf.setFontSize(12);
        pdf.setTextColor(255, 255, 255);
        pdf.text(`Day ${dayData.day}: ${dayData.title}`, margin + 5, yPosition + 8);
        yPosition += 16;
        
        pdf.setFontSize(10);
        pdf.setTextColor(100, 100, 100);
        pdf.text(dayData.date, margin + 5, yPosition);
        yPosition += 10;
        
        // Activities
        for (const activity of dayData.activities) {
          checkPageBreak(25);
          
          pdf.setFontSize(10);
          pdf.setTextColor(234, 67, 53);
          pdf.text(activity.time, margin + 5, yPosition);
          
          pdf.setTextColor(50, 50, 50);
          pdf.setFont(undefined, 'bold');
          pdf.text(activity.title, margin + 35, yPosition);
          pdf.setFont(undefined, 'normal');
          yPosition += 5;
          
          pdf.setFontSize(9);
          pdf.setTextColor(80, 80, 80);
          const descLines = pdf.splitTextToSize(activity.description, pageWidth - 2 * margin - 35);
          pdf.text(descLines, margin + 35, yPosition);
          yPosition += descLines.length * 4 + 2;
          
          pdf.setTextColor(100, 100, 100);
          pdf.text(`📍 ${activity.location}`, margin + 35, yPosition);
          yPosition += 10;
        }
        
        yPosition += 5;
      }
      
      // Footer
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text('Generated by Travabot', pageWidth / 2, pageHeight - 10, { align: 'center' });
      
      // Save the PDF
      pdf.save(`${trip.destination.city}-itinerary.pdf`);
      
      toast({
        title: "PDF Downloaded",
        description: "Your itinerary has been saved as a PDF file.",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Download Failed",
        description: "There was an error generating the PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleShare = async () => {
    if (!trip || days.length === 0) return;
    
    const shareData = {
      title: `${trip.destination.city} Itinerary`,
      text: `Check out my ${duration}-day trip to ${trip.destination.city}! ${formatDateRange()} • ${trip.travelers} ${trip.travelers === 1 ? 'person' : 'people'}`,
      url: window.location.href,
    };
    
    // Check if Web Share API is available
    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      setIsSharing(true);
      try {
        await navigator.share(shareData);
        toast({
          title: "Shared Successfully",
          description: "Your itinerary has been shared.",
        });
      } catch (error) {
        // User cancelled sharing, don't show error
        if ((error as Error).name !== 'AbortError') {
          console.error('Error sharing:', error);
        }
      } finally {
        setIsSharing(false);
      }
    } else {
      // Fallback to copy dialog
      setShareDialogOpen(true);
    }
  };

  const copyToClipboard = async () => {
    const shareText = `${trip?.destination.city} Itinerary\n${formatDateRange()} • ${duration} Days • ${trip?.travelers} ${trip?.travelers === 1 ? 'Person' : 'People'}\n\n${window.location.href}`;
    
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied to Clipboard",
        description: "Itinerary link has been copied.",
      });
    } catch (error) {
      console.error('Error copying:', error);
      toast({
        title: "Copy Failed",
        description: "Could not copy to clipboard. Please try again.",
        variant: "destructive",
      });
    }
  };

  const locateUser = () => {
    if (!mapRef.current || !navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        
        if (currentLocationMarkerRef.current) {
          currentLocationMarkerRef.current.remove();
        }

        const currentLocationIcon = L.divIcon({
          className: "current-location-marker",
          html: `<div style="background-color: #4285F4; width: 20px; height: 20px; border-radius: 50%; border: 4px solid white; box-shadow: 0 0 10px rgba(66, 133, 244, 0.6);"></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });

        currentLocationMarkerRef.current = L.marker([latitude, longitude], { icon: currentLocationIcon })
          .addTo(mapRef.current!)
          .bindPopup("<b>Your Location</b>");

        mapRef.current!.setView([latitude, longitude], 14);
      },
      (error) => {
        console.error("Error getting location:", error);
        alert("Unable to retrieve your location.");
      }
    );
  };

  if (!trip || !isConfigured) {
    return null;
  }

  const nights = duration > 0 ? duration - 1 : 0;
  const totalPrice = selections?.totalPrice || 0;

  const formatDateRange = () => {
    if (!trip.startDate || !trip.endDate) return '';
    return `${format(trip.startDate, 'MMM d')}-${format(trip.endDate, 'd, yyyy')}`;
  };

  const ItinerarySkeleton = () => (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="p-6 bg-card/50 border-border">
          <div className="flex items-center gap-4 mb-4">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div>
              <Skeleton className="h-6 w-24 mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((j) => (
              <div key={j} className="flex gap-4">
                <Skeleton className="w-10 h-10 rounded-lg" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-5 w-48 mb-1" />
                  <Skeleton className="h-4 w-64" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header Actions */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold gradient-text mb-2">
              Your {trip.destination.city} Itinerary
            </h1>
            <p className="text-muted-foreground">
              {formatDateRange()} • {duration} Days • {trip.travelers} {trip.travelers === 1 ? 'Person' : 'People'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf || days.length === 0}
            >
              {isGeneratingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {isGeneratingPdf ? 'Generating...' : 'Export'}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              onClick={handleShare}
              disabled={isSharing || days.length === 0}
            >
              {isSharing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
              Share
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Itinerary Days */}
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                <p className="text-lg font-medium">Generating your personalized itinerary...</p>
                <p className="text-sm text-muted-foreground">This may take a moment</p>
              </div>
            ) : error ? (
              <Card className="p-6 bg-card/50 border-border text-center">
                <p className="text-destructive mb-4">{error}</p>
                <Button onClick={() => window.location.reload()}>Try Again</Button>
              </Card>
            ) : days.length === 0 ? (
              <ItinerarySkeleton />
            ) : (
              <div className="space-y-4">
                {days.map((dayData) => (
                  <Card key={dayData.day} className="overflow-hidden bg-card/50 border-border shadow-card backdrop-blur-sm">
                    <div
                      className="p-6 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => toggleDay(dayData.day)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary">
                              <span className="text-sm font-bold text-primary">{dayData.day}</span>
                            </div>
                            <h3 className="text-xl font-bold">Day {dayData.day}</h3>
                          </div>
                          <p className="text-sm text-muted-foreground">{dayData.date}</p>
                          <p className="font-medium mt-1">{dayData.title}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDayMap(dayData.day);
                            }}
                            className="gap-2"
                          >
                            <MapIcon className="w-4 h-4" />
                            View on Map
                          </Button>
                          {expandedDays.includes(dayData.day) ? (
                            <ChevronUp className="w-5 h-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </div>

                    {expandedDays.includes(dayData.day) && (
                      <div className="border-t border-border">
                        <div className="p-6 space-y-6 bg-background/30">
                          {dayData.activities.map((activity, idx) => {
                            const Icon = getActivityIcon(activity.type);
                            return (
                              <div key={idx} className="flex gap-4">
                                <div className="flex flex-col items-center">
                                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/30">
                                    <Icon className="w-5 h-5 text-primary" />
                                  </div>
                                  {idx < dayData.activities.length - 1 && (
                                    <div className="w-0.5 h-12 bg-gradient-to-b from-primary/50 to-border mt-2" />
                                  )}
                                </div>
                                <div className="flex-1 pb-6">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Clock className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-sm font-medium text-primary">{activity.time}</span>
                                  </div>
                                  <h4 className="font-semibold mb-1">{activity.title}</h4>
                                  <p className="text-sm text-muted-foreground mb-1">{activity.description}</p>
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <MapPin className="w-3 h-3" />
                                    <span>{activity.location}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Summary Sidebar */}
          <div className="lg:col-span-1">
            <Card className="p-6 bg-card/50 border-border sticky top-24 shadow-card backdrop-blur-sm">
              <h3 className="text-lg font-bold mb-4 gradient-text">Trip Summary</h3>
              <div className="space-y-4 mb-6">
                <div className="p-3 bg-background/50 rounded-lg border border-border">
                  <p className="text-sm text-muted-foreground">Destination</p>
                  <p className="font-semibold">{trip.destination.city}{trip.destination.state ? `, ${trip.destination.state}` : ''}</p>
                </div>
                <div className="p-3 bg-background/50 rounded-lg border border-border">
                  <p className="text-sm text-muted-foreground">Duration</p>
                  <p className="font-semibold">{duration} Days, {nights} Nights</p>
                </div>
                <div className="p-3 bg-background/50 rounded-lg border border-border">
                  <p className="text-sm text-muted-foreground">Travelers</p>
                  <p className="font-semibold">{trip.travelers} {trip.travelers === 1 ? 'Person' : 'People'}</p>
                </div>
                {selections?.arrivalTransport && (
                  <div className="p-3 bg-background/50 rounded-lg border border-border">
                    <p className="text-sm text-muted-foreground">Transport</p>
                    <p className="font-semibold">{selections.arrivalTransport.name}</p>
                  </div>
                )}
                {selections?.hotel && (
                  <div className="p-3 bg-background/50 rounded-lg border border-border">
                    <p className="text-sm text-muted-foreground">Accommodation</p>
                    <p className="font-semibold">{selections.hotel.name}</p>
                  </div>
                )}
                <div className="border-t border-border pt-4">
                  <p className="text-sm text-muted-foreground mb-2">Total Price</p>
                  <p className="text-3xl font-bold gradient-text">₹{totalPrice.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    ₹{Math.round(totalPrice / (trip.travelers || 1)).toLocaleString()} per person
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <Button 
                  className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 animate-glow text-white font-semibold gap-2"
                  onClick={handleDownloadPdf}
                  disabled={isGeneratingPdf || days.length === 0}
                >
                  {isGeneratingPdf ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {isGeneratingPdf ? 'Generating...' : 'Download PDF'}
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full gap-2"
                  onClick={handleShare}
                  disabled={isSharing || days.length === 0}
                >
                  {isSharing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Share2 className="w-4 h-4" />
                  )}
                  Share Itinerary
                </Button>
              </div>

              <div className="mt-6 pt-6 border-t border-border">
                <p className="text-sm text-muted-foreground mb-2">Need Help?</p>
                <p className="font-semibold">24/7 Support</p>
                <p className="text-sm text-primary">support@travabot.com</p>
              </div>
            </Card>
          </div>
        </div>

        {/* Map Dialog */}
        <Dialog open={selectedDayMap !== null} onOpenChange={() => setSelectedDayMap(null)}>
          <DialogContent className="max-w-5xl max-h-[85vh] bg-card border-border p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span className="gradient-text">
                  Day {selectedDayMap} - {days.find(d => d.day === selectedDayMap)?.title || 'Activities'}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={locateUser}
                  className="gap-2"
                >
                  <Locate className="w-4 h-4" />
                  My Location
                </Button>
              </DialogTitle>
            </DialogHeader>
            <div
              id={`map-container-${selectedDayMap}`}
              className="h-[500px] rounded-lg overflow-hidden"
            />
          </DialogContent>
        </Dialog>

        {/* Share Dialog (Fallback for browsers without Web Share API) */}
        <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
          <DialogContent className="sm:max-w-md bg-card border-border">
            <DialogHeader>
              <DialogTitle className="gradient-text">Share Itinerary</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Share your {trip.destination.city} trip with friends and family
              </p>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <input 
                  readOnly 
                  value={window.location.href}
                  className="flex-1 bg-transparent text-sm outline-none"
                />
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={copyToClipboard}
                  className="gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-green-500" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                {trip.destination.city} • {formatDateRange()} • {duration} Days
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Itinerary;
