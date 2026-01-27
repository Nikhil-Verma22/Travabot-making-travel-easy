// Shared types for travel-related data

export interface POI {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: string;
  type: 'attraction' | 'restaurant' | 'hotel';
  tags: string[];
  rating: number;
  image: string;
  description?: string;
  priceLevel?: number; // 1-4 for hotels/restaurants
  address?: string;
}

export interface CityInfo {
  city: string;
  state: string | null;
  lat: number;
  lng: number;
  displayName?: string;
}

export interface TransportOption {
  id: string;
  name: string;
  type: 'flight' | 'train' | 'car';
  departureTime: string;
  arrivalTime: string;
  duration: string;
  price: number;
  details: string;
  provider: string;
}

export interface ItineraryDay {
  day: number;
  date: string;
  title: string;
  activities: ItineraryActivity[];
}

export interface ItineraryActivity {
  time: string;
  title: string;
  description: string;
  location: string;
  type: 'transport' | 'hotel' | 'attraction' | 'restaurant' | 'activity';
  lat?: number;
  lng?: number;
  duration?: string;
}

export interface TripSummary {
  source: CityInfo;
  destination: CityInfo;
  startDate: Date;
  endDate: Date;
  travelers: number;
  duration: number;
}

// Helper function to generate placeholder images
export function getPlaceholderImage(
  category: string,
  name: string,
  width = 400,
  height = 300
): string {
  const keywords = encodeURIComponent(`${category},${name.split(' ')[0]},india,travel`);
  return `https://source.unsplash.com/${width}x${height}/?${keywords}`;
}

// Format currency in INR
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

// Calculate trip duration in days
export function calculateDuration(startDate: Date, endDate: Date): number {
  return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}
