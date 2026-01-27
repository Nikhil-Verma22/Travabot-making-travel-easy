-- Add user_id column to trips table
ALTER TABLE public.trips 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id column to trip_selections table
ALTER TABLE public.trip_selections 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop old permissive policies on trips
DROP POLICY IF EXISTS "Anyone can create trips" ON public.trips;
DROP POLICY IF EXISTS "Anyone can view trips" ON public.trips;
DROP POLICY IF EXISTS "Anyone can update trips" ON public.trips;
DROP POLICY IF EXISTS "Anyone can delete trips" ON public.trips;

-- Drop old permissive policies on trip_selections
DROP POLICY IF EXISTS "Anyone can create trip selections" ON public.trip_selections;
DROP POLICY IF EXISTS "Anyone can view trip selections" ON public.trip_selections;
DROP POLICY IF EXISTS "Anyone can update trip selections" ON public.trip_selections;
DROP POLICY IF EXISTS "Anyone can delete trip selections" ON public.trip_selections;

-- Create secure RLS policies for trips (user-specific)
CREATE POLICY "Users can create their own trips"
ON public.trips FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own trips"
ON public.trips FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own trips"
ON public.trips FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trips"
ON public.trips FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create secure RLS policies for trip_selections (user-specific)
CREATE POLICY "Users can create their own trip selections"
ON public.trip_selections FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own trip selections"
ON public.trip_selections FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own trip selections"
ON public.trip_selections FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trip selections"
ON public.trip_selections FOR DELETE
TO authenticated
USING (auth.uid() = user_id);