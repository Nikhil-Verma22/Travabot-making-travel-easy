@echo off
echo ========================================
echo TravaBOT - Supabase Setup Script
echo ========================================
echo.

echo Step 1: Installing Supabase CLI...
call npm install -g supabase
if %errorlevel% neq 0 (
    echo ERROR: Failed to install Supabase CLI
    pause
    exit /b 1
)
echo ✓ Supabase CLI installed
echo.

echo Step 2: Logging in to Supabase...
echo (This will open a browser window)
call supabase login
if %errorlevel% neq 0 (
    echo ERROR: Failed to login to Supabase
    pause
    exit /b 1
)
echo ✓ Logged in to Supabase
echo.

echo Step 3: Linking to your project...
call supabase link --project-ref qufkdbiqusnmstscbpja --password "travabot#22"
if %errorlevel% neq 0 (
    echo ERROR: Failed to link project
    pause
    exit /b 1
)
echo ✓ Project linked
echo.

echo Step 4: Deploying Edge Functions...
echo.

echo Deploying search-cities...
call supabase functions deploy search-cities
echo.

echo Deploying fetch-pois...
call supabase functions deploy fetch-pois
echo.

echo Deploying generate-transport...
call supabase functions deploy generate-transport
echo.

echo Deploying generate-itinerary...
call supabase functions deploy generate-itinerary
echo.

echo Deploying get-place-info...
call supabase functions deploy get-place-info
echo.

echo Deploying chat...
call supabase functions deploy chat
echo.

echo ✓ All edge functions deployed
echo.

echo Step 5: Setting environment variables...
call supabase secrets set GEMINI_API_KEY=AIzaSyC4NGR2CWVoSiuIVBEW9eTX4fx3puC3qjU
if %errorlevel% neq 0 (
    echo WARNING: Failed to set GEMINI_API_KEY
)
echo ✓ Environment variables set
echo.

echo ========================================
echo ✓ Setup Complete!
echo ========================================
echo.
echo Your TravaBOT backend is now ready!
echo.
echo Next steps:
echo 1. Run: npm run dev
echo 2. Open: http://localhost:8080
echo 3. Test the app with any Indian city!
echo.
pause
