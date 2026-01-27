import { useEffect, useRef, memo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Maximize2, Locate } from 'lucide-react';

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  name: string;
  category?: string;
  isSelected?: boolean;
}

interface MapViewProps {
  center: { lat: number; lng: number };
  zoom?: number;
  markers?: MapMarker[];
  height?: string;
  showControls?: boolean;
  onFullscreen?: () => void;
  title?: string;
  subtitle?: string;
  className?: string;
}

export const MapView = memo(function MapView({
  center,
  zoom = 12,
  markers = [],
  height = 'h-96',
  showControls = true,
  onFullscreen,
  title,
  subtitle,
  className = '',
}: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const currentLocationRef = useRef<L.Marker | null>(null);

  const locateUser = () => {
    if (!mapRef.current || !navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;

        if (currentLocationRef.current) {
          currentLocationRef.current.remove();
        }

        const icon = L.divIcon({
          className: 'current-location-marker',
          html: `<div style="background-color: #4285F4; width: 20px; height: 20px; border-radius: 50%; border: 4px solid white; box-shadow: 0 0 10px rgba(66, 133, 244, 0.6);"></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });

        currentLocationRef.current = L.marker([latitude, longitude], { icon })
          .addTo(mapRef.current!)
          .bindPopup('<b>Your Location</b>');

        mapRef.current!.setView([latitude, longitude], 14);
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Unable to retrieve your location.');
      }
    );
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    mapRef.current = L.map(mapContainerRef.current).setView([center.lat, center.lng], zoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(mapRef.current);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update center when it changes
  useEffect(() => {
    if (mapRef.current && center.lat && center.lng) {
      mapRef.current.setView([center.lat, center.lng], zoom);
    }
  }, [center.lat, center.lng, zoom]);

  // Update markers
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    if (markers.length === 0) {
      mapRef.current.setView([center.lat, center.lng], zoom);
      return;
    }

    // Add new markers
    markers.forEach((m) => {
      const marker = L.marker([m.lat, m.lng])
        .addTo(mapRef.current!)
        .bindPopup(`<b>${m.name}</b>${m.category ? `<br>${m.category}` : ''}`);
      markersRef.current.push(marker);
    });

    // Fit bounds if multiple markers
    if (markers.length > 1) {
      const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng]));
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    } else if (markers.length === 1) {
      mapRef.current.setView([markers[0].lat, markers[0].lng], 14);
    }
  }, [markers, center, zoom]);

  return (
    <Card className={`overflow-hidden border-border shadow-card ${className}`}>
      {(title || showControls) && (
        <div className="p-4 bg-card/50 border-b border-border flex items-center justify-between">
          <div>
            {title && <h3 className="font-semibold">{title}</h3>}
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {showControls && (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={locateUser}
                className="h-8 w-8"
                title="Show my location"
              >
                <Locate className="w-4 h-4" />
              </Button>
              {onFullscreen && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onFullscreen}
                  className="h-8 w-8"
                >
                  <Maximize2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      )}
      <div ref={mapContainerRef} className={`w-full ${height} bg-muted`} />
    </Card>
  );
});
