

# Complete Local Development Setup Guide

This guide will walk you through setting up the Jaipur Travel Planning application to run independently on your local machine.

---

## Overview

The application consists of two main parts:
1. **Frontend** - React + Vite application (runs in browser)
2. **Backend** - Supabase services (database, authentication, edge functions)

---

## Prerequisites

Before starting, ensure you have:

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | v18 or higher | Run the frontend |
| npm or bun | Latest | Package manager |
| Git | Latest | Clone repository |
| Supabase CLI | Latest | Deploy edge functions |
| Deno | v1.40+ | Run edge functions locally |

---

## Step 1: Clone and Install Dependencies

```text
# Clone the repository
git clone <your-repo-url>
cd <project-folder>

# Install dependencies
npm install
```

This installs all 50+ packages including:
- React 18, React Router, React Query
- Tailwind CSS, shadcn/ui components
- Leaflet for maps
- jsPDF for PDF generation
- Supabase client SDK

---

## Step 2: Create Your Own Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project (choose any region)
3. Wait for the project to be provisioned (~2 minutes)
4. Navigate to **Settings > API** and note down:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)
   - **service_role key** (for edge functions)

---

## Step 3: Create Database Tables

Run these SQL commands in **Supabase Dashboard > SQL Editor**:

```text
-- Table 1: Trips (stores user trip information)
CREATE TABLE public.trips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
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

-- Table 2: Trip Selections (stores selected attractions/hotels)
CREATE TABLE public.trip_selections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID,
  user_id UUID REFERENCES auth.users(id),
  selected_attractions JSONB DEFAULT '[]',
  selected_restaurants JSONB DEFAULT '[]',
  selected_hotel JSONB,
  arrival_transport JSONB,
  return_transport JSONB,
  itinerary JSONB DEFAULT '[]',
  total_price INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table 3: Cached Cities (caches POI data)
CREATE TABLE public.cached_cities (
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
  UNIQUE(city_name)
);

-- Enable Row Level Security
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cached_cities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trips
CREATE POLICY "Users can view their own trips"
  ON public.trips FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own trips"
  ON public.trips FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own trips"
  ON public.trips FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own trips"
  ON public.trips FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for trip_selections
CREATE POLICY "Users can view their own trip selections"
  ON public.trip_selections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own trip selections"
  ON public.trip_selections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own trip selections"
  ON public.trip_selections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own trip selections"
  ON public.trip_selections FOR DELETE USING (auth.uid() = user_id);

-- RLS Policy for cached_cities (public read)
CREATE POLICY "Anyone can read cached cities"
  ON public.cached_cities FOR SELECT USING (true);
```

---

## Step 4: Configure Authentication

In **Supabase Dashboard > Authentication > Settings**:

1. **Enable Email Provider**: 
   - Turn ON "Enable Email Signup"
   - Turn ON "Confirm email" = OFF (auto-confirm for development)

2. **Site URL**: Set to `http://localhost:8080`

3. **Redirect URLs**: Add `http://localhost:8080`

---

## Step 5: Create Environment File

Create a `.env` file in the project root:

```text
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ... (your anon key)
VITE_SUPABASE_PROJECT_ID=YOUR_PROJECT_ID
```

Replace with your actual Supabase project values.

---

## Step 6: Deploy Edge Functions

The application uses 7 edge functions. You need to deploy them to your Supabase project.

### 6.1 Install Supabase CLI

```text
npm install -g supabase
```

### 6.2 Login to Supabase

```text
supabase login
```

### 6.3 Link to Your Project

```text
supabase link --project-ref YOUR_PROJECT_ID
```

### 6.4 Set Edge Function Secrets

These functions require API keys. In **Supabase Dashboard > Settings > Edge Functions > Secrets**, add:

| Secret Name | Required By | How to Get |
|-------------|-------------|------------|
| `SUPABASE_URL` | All functions | Your project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | fetch-pois, geocode-city | Dashboard > Settings > API |
| `LOVABLE_API_KEY` | chat, generate-itinerary, generate-transport | See note below |

**Note on LOVABLE_API_KEY**: This key powers the AI features through Lovable's AI gateway. For local development without Lovable, you have two options:

**Option A**: Replace with OpenAI API key
- Get an API key from [platform.openai.com](https://platform.openai.com)
- Modify edge functions to use OpenAI directly (code changes required)

**Option B**: Disable AI features
- Comment out AI-dependent code
- Use static/mock data for itineraries and transport

### 6.5 Deploy All Functions

```text
supabase functions deploy chat
supabase functions deploy fetch-pois
supabase functions deploy generate-itinerary
supabase functions deploy generate-transport
supabase functions deploy geocode-city
supabase functions deploy get-place-info
supabase functions deploy search-cities
```

---

## Step 7: Update Supabase Client Configuration

Edit `src/integrations/supabase/client.ts` if needed (usually auto-generated):

```text
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
```

---

## Step 8: Run the Application

```text
npm run dev
```

The app will be available at `http://localhost:8080`

---

## Feature-by-Feature Breakdown

### Features That Work Out of the Box (No Backend Needed)

| Feature | Location | Notes |
|---------|----------|-------|
| Homepage UI | `/` | Full hero section, animations |
| Theme Toggle | Header | Dark/light mode switching |
| Map Display | `/explore` | Uses free OpenStreetMap tiles |
| PDF Download | `/itinerary` | Client-side jsPDF generation |
| Share Dialog | `/itinerary` | Web Share API / clipboard |
| Navigation | All pages | React Router |

### Features Requiring Supabase Database

| Feature | Tables Used | What Happens Without |
|---------|-------------|---------------------|
| User Login/Signup | `auth.users` | Can't create accounts |
| Save Trips | `trips` | Trip data not persisted |
| Save Selections | `trip_selections` | Selections lost on refresh |
| POI Caching | `cached_cities` | Slower API calls each time |

### Features Requiring Edge Functions

| Feature | Edge Function | External APIs Used |
|---------|---------------|-------------------|
| City Search Autocomplete | `search-cities` | Nominatim (free) |
| City Geocoding | `geocode-city` | Nominatim (free) |
| Fetch Attractions/Restaurants | `fetch-pois` | Overpass API (free), Wikipedia API (free) |
| Place Details | `get-place-info` | Wikipedia API (free) |
| AI Chatbot | `chat` | Lovable AI Gateway (requires key) |
| Generate Itinerary | `generate-itinerary` | Lovable AI Gateway (requires key) |
| Transport Options | `generate-transport` | Lovable AI Gateway (requires key) |

---

## Alternative: Using OpenAI Instead of Lovable AI

If you want to run AI features without a Lovable API key, modify the edge functions:

### Example: Modify `generate-itinerary/index.ts`

```text
// Replace this:
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
  headers: { Authorization: `Bearer ${LOVABLE_API_KEY}` },
  ...
});

// With this:
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const response = await fetch("https://api.openai.com/v1/chat/completions", {
  headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
  body: JSON.stringify({
    model: "gpt-4o-mini", // or "gpt-4"
    ...
  })
});
```

Add `OPENAI_API_KEY` to your Supabase secrets.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "CORS error" on edge functions | Ensure functions have CORS headers |
| "LOVABLE_API_KEY not configured" | Add the secret or modify to use OpenAI |
| "City not found" | Check Nominatim rate limits (1 req/sec) |
| "RLS policy violation" | Ensure user is logged in for protected tables |
| Maps not loading | Check Leaflet CSS is imported |
| Auth not persisting | Check localStorage is enabled |

---

## Summary Checklist

```text
[ ] Node.js installed (v18+)
[ ] Repository cloned
[ ] npm install completed
[ ] Supabase project created
[ ] Database tables created with RLS
[ ] .env file configured
[ ] Supabase CLI installed and linked
[ ] Edge function secrets configured
[ ] Edge functions deployed
[ ] Authentication settings configured
[ ] npm run dev - app loads at localhost:8080
```

---

## Cost Considerations

| Service | Free Tier | Paid Tier |
|---------|-----------|-----------|
| Supabase | 500MB DB, 2GB bandwidth | $25/mo starts |
| OpenAI (if used) | $5 free credits | Pay as you go |
| Nominatim | Free (rate limited) | N/A |
| Overpass API | Free | N/A |
| Wikipedia API | Free | N/A |
| OpenStreetMap | Free | N/A |

Most features can run entirely on free tiers!

