@echo off
echo ========================================
echo   Plant Whisperer Mock Server Setup
echo ========================================
echo.
echo This will start both:
echo   1. Mock Sensor Server (port 4000)
echo   2. Sensor Mock UI (port 5173)
echo.
echo Press Ctrl+C to stop both servers
echo.
echo ========================================
echo.

cd mock-server
start "Mock Sensor Server" cmd /k "npm run server"

timeout /t 2 /nobreak >nul

cd ..\sensor-mock-ui
start "Sensor Mock UI" cmd /k "npm run dev"

echo.
echo Both servers are starting in separate windows...
echo.
echo Mock Sensor Server: http://localhost:4000
echo Sensor Mock UI: http://localhost:5173
echo.
echo Close this window to stop (or close the individual server windows)
pause

