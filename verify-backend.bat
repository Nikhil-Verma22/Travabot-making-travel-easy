@echo off
echo ========================================
echo TravaBOT - Backend Verification
echo ========================================
echo.

echo Checking Supabase CLI...
call supabase --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Supabase CLI not installed
    echo Run: npm install -g supabase
    echo.
    pause
    exit /b 1
) else (
    echo ✓ Supabase CLI installed
)
echo.

echo Checking project link...
call supabase projects list >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Not logged in to Supabase
    echo Run: supabase login
    echo.
    pause
    exit /b 1
) else (
    echo ✓ Logged in to Supabase
)
echo.

echo Checking edge functions...
call supabase functions list
echo.

echo ========================================
echo Verification Complete
echo ========================================
echo.
echo If you see functions listed above, your backend is ready!
echo If not, run: setup-supabase.bat
echo.
pause
