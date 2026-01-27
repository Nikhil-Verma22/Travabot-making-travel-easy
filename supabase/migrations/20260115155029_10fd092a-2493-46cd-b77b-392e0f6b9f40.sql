-- Create trips table to store user trip configurations
CREATE TABLE public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_city TEXT NOT NULL,
  source_state TEXT,
  source_lat DECIMAL(10, 8),
  source_lng DECIMAL(11, 8),
  destination_city TEXT NOT NULL,
  destination_state TEXT,
  destination_lat DECIMAL(10, 8),
  destination_lng DECIMAL(11, 8),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  travelers INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create cached_cities table to cache POI data and reduce API calls
CREATE TABLE public.cached_cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_name TEXT NOT NULL,
  state TEXT,
  lat DECIMAL(10, 8),
  lng DECIMAL(11, 8),
  attractions JSONB DEFAULT '[]',
  restaurants JSONB DEFAULT '[]',
  hotels JSONB DEFAULT '[]',
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  UNIQUE(city_name, state)
);

-- Create trip_selections table to store user's choices
CREATE TABLE public.trip_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
  selected_attractions JSONB DEFAULT '[]',
  selected_restaurants JSONB DEFAULT '[]',
  selected_hotel JSONB,
  arrival_transport JSONB,
  return_transport JSONB,
  itinerary JSONB DEFAULT '[]',
  total_price INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cached_cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_selections ENABLE ROW LEVEL SECURITY;

-- Trips table: Public read/write for now (no auth yet - prototype)
CREATE POLICY "Anyone can create trips"
ON public.trips FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can view trips"
ON public.trips FOR SELECT
USING (true);

CREATE POLICY "Anyone can update trips"
ON public.trips FOR UPDATE
USING (true);

CREATE POLICY "Anyone can delete trips"
ON public.trips FOR DELETE
USING (true);

-- Cached cities: Public read, only edge functions write (via service role)
CREATE POLICY "Anyone can read cached cities"
ON public.cached_cities FOR SELECT
USING (true);

-- Trip selections: Public read/write for now (no auth yet - prototype)
CREATE POLICY "Anyone can create trip selections"
ON public.trip_selections FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can view trip selections"
ON public.trip_selections FOR SELECT
USING (true);

CREATE POLICY "Anyone can update trip selections"
ON public.trip_selections FOR UPDATE
USING (true);

CREATE POLICY "Anyone can delete trip selections"
ON public.trip_selections FOR DELETE
USING (true);

-- Create index for faster city lookups
CREATE INDEX idx_cached_cities_name ON public.cached_cities(city_name);
CREATE INDEX idx_trips_destination ON public.trips(destination_city);

-- Create trigger for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_trips_updated_at
BEFORE UPDATE ON public.trips
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();