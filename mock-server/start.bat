@echo off
echo Starting Mock Sensor Server...
echo.
echo Checking if port 4000 is available...
call npm run check-port
if errorlevel 1 (
    echo.
    echo Port 4000 is in use. Attempting to free it...
    call npm run free-port
    timeout /t 2 /nobreak >nul
)
echo.
echo Server will run on port 4000
echo WebSocket endpoint: ws://localhost:4000/ws
echo.
npm run server

