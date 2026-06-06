-- TravaBOT Database Setup
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/qufkdbiqusnmstscbpja/sql

-- Create trips table
CREATE TABLE IF NOT EXISTS public.trips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  source_city TEXT NOT NULL,
  source_state TEXT,
  source_lat NUMERIC,
  source_lng NUMERIC,
  destination_city TEXT NOT NULL,
  destination_state TEXT,
  destination_lat NUMERIC,
  destination_lng NUMERIC,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  travelers INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create trip_selections table
CREATE TABLE IF NOT EXISTS public.trip_selections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  selected_attractions JSONB DEFAULT '[]',
  selected_restaurants JSONB DEFAULT '[]',
  selected_hotel JSONB,
  arrival_transport JSONB,
  return_transport JSONB,
  itinerary JSONB DEFAULT '[]',
  total_price INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create cached_cities table for POI caching
CREATE TABLE IF NOT EXISTS public.cached_cities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  city_name TEXT NOT NULL,
  state TEXT,
  lat NUMERIC,
  lng NUMERIC,
  attractions JSONB DEFAULT '[]',
  restaurants JSONB DEFAULT '[]',
  hotels JSONB DEFAULT '[]',
  fetched_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days'),
  UNIQUE(city_name, state)
);

-- Enable Row Level Security
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cached_cities ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own trips" ON public.trips;
DROP POLICY IF EXISTS "Users can create their own trips" ON public.trips;
DROP POLICY IF EXISTS "Users can update their own trips" ON public.trips;
DROP POLICY IF EXISTS "Users can delete their own trips" ON public.trips;

DROP POLICY IF EXISTS "Users can view their own trip selections" ON public.trip_selections;
DROP POLICY IF EXISTS "Users can create their own trip selections" ON public.trip_selections;
DROP POLICY IF EXISTS "Users can update their own trip selections" ON public.trip_selections;
DROP POLICY IF EXISTS "Users can delete their own trip selections" ON public.trip_selections;

DROP POLICY IF EXISTS "Anyone can read cached cities" ON public.cached_cities;
DROP POLICY IF EXISTS "Service role can write cached cities" ON public.cached_cities;

-- RLS Policies for trips
CREATE POLICY "Users can view their own trips" 
  ON public.trips FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own trips" 
  ON public.trips FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trips" 
  ON public.trips FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trips" 
  ON public.trips FOR DELETE 
  USING (auth.uid() = user_id);

-- RLS Policies for trip_selections
CREATE POLICY "Users can view their own trip selections" 
  ON public.trip_selections FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own trip selections" 
  ON public.trip_selections FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trip selections" 
  ON public.trip_selections FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trip selections" 
  ON public.trip_selections FOR DELETE 
  USING (auth.uid() = user_id);

-- RLS Policies for cached_cities (public read, service role write)
CREATE POLICY "Anyone can read cached cities" 
  ON public.cached_cities FOR SELECT 
  USING (true);

CREATE POLICY "Service role can write cached cities" 
  ON public.cached_cities FOR ALL 
  USING (auth.jwt()->>'role' = 'service_role');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON public.trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_selections_user_id ON public.trip_selections(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_selections_trip_id ON public.trip_selections(trip_id);
CREATE INDEX IF NOT EXISTS idx_cached_cities_name ON public.cached_cities(city_name);
CREATE INDEX IF NOT EXISTS idx_cached_cities_expires ON public.cached_cities(expires_at);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✓ Database setup complete!';
  RAISE NOTICE 'Tables created: trips, trip_selections, cached_cities';
  RAISE NOTICE 'RLS policies enabled and configured';
  RAISE NOTICE 'Indexes created for performance';
END $$;
