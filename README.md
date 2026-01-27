# TravaBOT - India Travel Planning App

A comprehensive travel planning application for exploring India, featuring AI-powered itinerary generation, city search, attractions discovery, and transport options.

## 🏆 FOR JUDGES - QUICK SETUP GUIDE

### ⚡ Fastest Way to Run (5 minutes)

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev

# 3. Open http://localhost:8080
```

**✅ What works immediately:**
- Complete UI with dark/light themes
- Interactive maps and navigation
- PDF generation and sharing
- All frontend features

**🔧 For full functionality (database + AI):**
- Follow the detailed setup below to enable user accounts and AI features

---

## 🚀 Complete Setup (Local Development)

### Prerequisites

- **Node.js** v18 or higher
- **npm** or **bun**
- **Supabase CLI** (for edge functions)
- **Git**

### Step 1: Clone & Install

```bash
# Clone the repository
git clone <your-repo-url>
cd <project-folder>

# Install dependencies
npm install
```

### Step 2: Create Your Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project (any region)
3. Note down from **Settings > API**:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)
   - **service_role key** (for edge functions)

### Step 3: Configure Environment

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key_here
VITE_SUPABASE_PROJECT_ID=YOUR_PROJECT_ID
```

### Step 4: Set Up Database

Run this SQL in **Supabase Dashboard > SQL Editor**:

```sql
-- Create trips table
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

-- Create trip_selections table
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

-- Create cached_cities table
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
  UNIQUE(city_name, state)
);

-- Enable Row Level Security
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cached_cities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trips
CREATE POLICY "Users can view their own trips" ON public.trips FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own trips" ON public.trips FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own trips" ON public.trips FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own trips" ON public.trips FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for trip_selections
CREATE POLICY "Users can view their own trip selections" ON public.trip_selections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own trip selections" ON public.trip_selections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own trip selections" ON public.trip_selections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own trip selections" ON public.trip_selections FOR DELETE USING (auth.uid() = user_id);

-- RLS Policy for cached_cities (public read)
CREATE POLICY "Anyone can read cached cities" ON public.cached_cities FOR SELECT USING (true);
```

### Step 5: Configure Authentication

In **Supabase Dashboard > Authentication > Settings**:

1. Enable **Email** provider
2. Set "Confirm email" to **OFF** (auto-confirm for development)
3. Set **Site URL** to `http://localhost:8080`
4. Add `http://localhost:8080` to **Redirect URLs**

### Step 6: Deploy Edge Functions

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref YOUR_PROJECT_ID

# Deploy all edge functions
supabase functions deploy chat
supabase functions deploy fetch-pois
supabase functions deploy generate-itinerary
supabase functions deploy generate-transport
supabase functions deploy geocode-city
supabase functions deploy get-place-info
supabase functions deploy search-cities
```

### Step 7: Set Edge Function Secrets

In **Supabase Dashboard > Settings > Edge Functions > Secrets**, add:

| Secret | Description |
|--------|-------------|
| `SUPABASE_URL` | Your project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key from API settings |
| `OPENAI_API_KEY` | **OR** `LOVABLE_API_KEY` for AI features |

> **Note:** AI features (chat, itinerary, transport) require either an OpenAI API key or Lovable API key. Get an OpenAI key from [platform.openai.com](https://platform.openai.com).

### Step 8: Run the App

```bash
npm run dev
```

Open [http://localhost:8080](http://localhost:8080)

---

## 🎯 Features

### Works Without Backend
- ✅ Homepage UI with animations
- ✅ Dark/Light theme toggle
- ✅ Map display (OpenStreetMap)
- ✅ PDF itinerary download
- ✅ Share functionality
- ✅ Navigation

### Requires Supabase Database
- 🔐 User authentication (signup/login)
- 💾 Save trips
- 💾 Save selections
- ⚡ POI caching

### Requires Edge Functions
- 🔍 City search autocomplete (free APIs)
- 📍 City geocoding (free APIs)
- 🏛️ Fetch attractions/restaurants (free APIs)
- 📖 Place details (free APIs)
- 🤖 AI Chatbot (requires API key)
- 📅 AI Itinerary generation (requires API key)
- 🚗 Transport options (requires API key)

---

## 🛠️ Tech Stack

- **Frontend:** React 18, TypeScript, Vite
- **Styling:** Tailwind CSS, shadcn/ui
- **State:** React Query, Context API
- **Maps:** Leaflet + OpenStreetMap
- **Backend:** Supabase (Auth, Database, Edge Functions)
- **AI:** OpenAI / Lovable AI Gateway
- **PDF:** jsPDF

---

## 📁 Project Structure

```
├── src/
│   ├── components/     # React components
│   ├── context/        # React contexts
│   ├── hooks/          # Custom hooks
│   ├── pages/          # Route pages
│   ├── types/          # TypeScript types
│   └── integrations/   # Supabase client
├── supabase/
│   └── functions/      # Edge functions
│       ├── chat/
│       ├── fetch-pois/
│       ├── generate-itinerary/
│       ├── generate-transport/
│       ├── geocode-city/
│       ├── get-place-info/
│       └── search-cities/
└── public/             # Static assets
```

---

## 💰 Cost Considerations

| Service | Free Tier |
|---------|-----------|
| Supabase | 500MB DB, 2GB bandwidth |
| OpenAI | ~$5 free credits |
| Nominatim | Free (rate limited) |
| Overpass API | Free |
| Wikipedia API | Free |
| OpenStreetMap | Free |

**Most features run entirely on free tiers!**

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| CORS errors | Check edge function CORS headers |
| "API key not configured" | Add OPENAI_API_KEY to Supabase secrets |
| City not found | Nominatim has 1 req/sec limit |
| RLS policy violation | Ensure user is logged in |
| Maps not loading | Check Leaflet CSS is imported |

---

## 📄 License

MIT
#   T e a m - I n t e l l e c t u s  
 #   T e a m - I n t e l l e c t u s  
 