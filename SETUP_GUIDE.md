# 🚀 TravaBOT - Complete Setup Guide

## Your New Supabase Project

```
Project URL: https://qufkdbiqusnmstscbpja.supabase.co
Project ID: qufkdbiqusnmstscbpja
Database Password: travabot#22
```

## Quick Setup (Automated)

### Option 1: Run the Setup Script (Easiest)

```bash
# Just run this script - it does everything!
setup-supabase.bat
```

This will:
1. Install Supabase CLI
2. Login to Supabase
3. Link your project
4. Deploy all edge functions
5. Set environment variables

Then run:
```bash
npm run dev
```

---

## Manual Setup (If Script Fails)

### Step 1: Install Supabase CLI

```bash
npm install -g supabase
```

### Step 2: Login to Supabase

```bash
supabase login
```

This will open a browser. Login with your Supabase account.

### Step 3: Link Your Project

```bash
supabase link --project-ref qufkdbiqusnmstscbpja --password "travabot#22"
```

### Step 4: Setup Database

1. Go to: https://supabase.com/dashboard/project/qufkdbiqusnmstscbpja/sql
2. Click "New Query"
3. Copy the contents of `setup-database.sql`
4. Paste and click "Run"

This creates:
- `trips` table (user trip data)
- `trip_selections` table (selected attractions/hotels)
- `cached_cities` table (POI caching for performance)
- RLS policies (security)
- Indexes (performance)

### Step 5: Deploy Edge Functions

```bash
supabase functions deploy search-cities
supabase functions deploy fetch-pois
supabase functions deploy generate-transport
supabase functions deploy generate-itinerary
supabase functions deploy get-place-info
supabase functions deploy chat
```

### Step 6: Set Environment Variables

```bash
supabase secrets set GEMINI_API_KEY=AIzaSyC4NGR2CWVoSiuIVBEW9eTX4fx3puC3qjU
```

### Step 7: Enable Authentication

1. Go to: https://supabase.com/dashboard/project/qufkdbiqusnmstscbpja/auth/providers
2. Enable **Email** provider
3. Turn OFF "Confirm email" (for easier testing)
4. Set Site URL: `http://localhost:8080`
5. Add Redirect URL: `http://localhost:8080`

### Step 8: Run the App

```bash
npm run dev
```

Open: http://localhost:8080

---

## What Each Edge Function Does

### 1. `search-cities`
- Searches for Indian cities using Nominatim API
- Has 60+ popular cities cached locally for instant results
- Falls back to OpenStreetMap for comprehensive search
- **Works for ANY Indian city**

### 2. `fetch-pois`
- Fetches real attractions, restaurants, hotels from Overpass API (OpenStreetMap)
- Enriches with Wikipedia images automatically
- Caches results in database for 30 days
- **Returns real POIs for ANY location**

### 3. `generate-transport`
- Uses AI (Gemini) to generate realistic transport options
- Provides flights, trains, buses between cities
- Considers real routes and travel times
- **Works for ANY city pair**

### 4. `generate-itinerary`
- Uses AI (Gemini) to create personalized day-by-day itineraries
- Considers selected attractions, restaurants, hotel
- Creates realistic timing and descriptions
- **Fully AI-powered**

### 5. `get-place-info`
- Fetches information from Wikipedia
- Gets images from Wikimedia Commons
- Provides descriptions and links
- **Works for ANY landmark**

### 6. `chat`
- AI-powered chatbot using Gemini
- Understands trip context
- Provides personalized travel recommendations
- **Real conversational AI**

---

## Testing the Setup

### Test 1: City Search
1. Go to Home page
2. Type "Mumbai" in destination
3. Should see real Mumbai with coordinates

### Test 2: POIs
1. Set destination to "Mumbai"
2. Go to Explore page
3. Should see real attractions like Gateway of India, Marine Drive

### Test 3: AI Chatbot
1. Click chatbot icon
2. Ask "What are the best places in Mumbai?"
3. Should get AI-generated response

### Test 4: Itinerary
1. Select some attractions
2. Go to Itinerary page
3. Click "Generate Itinerary"
4. Should get AI-generated day-by-day plan

---

## Troubleshooting

### Error: "Function not found"
**Solution**: Edge functions not deployed. Run:
```bash
supabase functions deploy search-cities
supabase functions deploy fetch-pois
# ... deploy all functions
```

### Error: "Invalid API key"
**Solution**: Set the Gemini API key:
```bash
supabase secrets set GEMINI_API_KEY=AIzaSyC4NGR2CWVoSiuIVBEW9eTX4fx3puC3qjU
```

### Error: "Permission denied"
**Solution**: Database tables not created. Run `setup-database.sql` in Supabase SQL Editor.

### Error: "CORS error"
**Solution**: Check that edge functions have CORS headers (they should by default).

### No data showing
**Solution**: 
1. Check browser console for errors
2. Verify edge functions are deployed: https://supabase.com/dashboard/project/qufkdbiqusnmstscbpja/functions
3. Check function logs for errors

---

## Project Structure

```
travabot-main/
├── src/
│   ├── hooks/
│   │   ├── useCitySearch.ts      → Calls search-cities function
│   │   ├── usePOIs.ts             → Calls fetch-pois function
│   │   ├── useTransport.ts        → Calls generate-transport function
│   │   ├── useItinerary.ts        → Calls generate-itinerary function
│   │   └── usePlaceInfo.ts        → Calls get-place-info function
│   ├── components/
│   │   └── ChatBot.tsx            → Calls chat function
│   └── integrations/
│       └── supabase/
│           └── client.ts          → Supabase client config
├── supabase/
│   └── functions/
│       ├── search-cities/         → City search edge function
│       ├── fetch-pois/            → POI fetching edge function
│       ├── generate-transport/    → Transport generation edge function
│       ├── generate-itinerary/    → Itinerary generation edge function
│       ├── get-place-info/        → Place info edge function
│       └── chat/                  → Chatbot edge function
├── .env                           → Environment variables (updated)
├── setup-supabase.bat             → Automated setup script
├── setup-database.sql             → Database setup SQL
└── SETUP_GUIDE.md                 → This file
```

---

## Environment Variables

Your `.env` file has been updated with:

```env
VITE_SUPABASE_PROJECT_ID="qufkdbiqusnmstscbpja"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGci..."
VITE_SUPABASE_URL="https://qufkdbiqusnmstscbpja.supabase.co"
GEMINI_API_KEY="AIzaSyC4NGR2CWVoSiuIVBEW9eTX4fx3puC3qjU"
```

---

## Quick Links

- **Supabase Dashboard**: https://supabase.com/dashboard/project/qufkdbiqusnmstscbpja
- **SQL Editor**: https://supabase.com/dashboard/project/qufkdbiqusnmstscbpja/sql
- **Edge Functions**: https://supabase.com/dashboard/project/qufkdbiqusnmstscbpja/functions
- **Database**: https://supabase.com/dashboard/project/qufkdbiqusnmstscbpja/database/tables
- **Authentication**: https://supabase.com/dashboard/project/qufkdbiqusnmstscbpja/auth/users

---

## Next Steps

1. ✅ Run `setup-supabase.bat` (or follow manual steps)
2. ✅ Run `npm run dev`
3. ✅ Open http://localhost:8080
4. ✅ Test with any Indian city!

**Your TravaBOT is now ready with full backend support!** 🎉
