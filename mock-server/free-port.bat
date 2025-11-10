@echo off
echo Freeing port 4000...
echo.

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :4000 ^| findstr LISTENING') do (
    echo Killing process %%a...
    taskkill /PID %%a /F >nul 2>&1
    if errorlevel 1 (
        echo Failed to kill process %%a
    ) else (
        echo Successfully killed process %%a
    )
)

echo.
echo Port 4000 should now be free!
timeout /t 1 /nobreak >nul

