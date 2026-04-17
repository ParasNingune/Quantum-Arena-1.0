@echo off
echo ============================================
echo   ClariMed — Backend Setup
echo ============================================

echo.
echo [1/4] Creating virtual environment...
python -m venv venv
if errorlevel 1 (
    echo ERROR: Python not found. Install Python 3.10+ from python.org
    pause & exit /b 1
)

echo.
echo [2/4] Activating virtual environment...
call venv\Scripts\activate.bat

echo.
echo [3/4] Installing dependencies...
pip install --upgrade pip --quiet
pip install -r requirements.txt
if errorlevel 1 (
    echo ERROR: pip install failed. Check your internet connection.
    pause & exit /b 1
)

echo.
echo [4/4] Setting up .env file...
if not exist .env (
    copy .env.example .env
    echo.
    echo ACTION REQUIRED: Open backend\.env and paste your Anthropic API key.
    echo Get it free at: https://console.anthropic.com/
) else (
    echo .env already exists — skipping.
)

echo.
echo ============================================
echo   Setup complete!
echo.
echo   Next steps:
echo   1. Edit .env and add your ANTHROPIC_API_KEY
echo   2. Run:  venv\Scripts\activate
echo   3. Test: python test.py path\to\report.pdf
echo   4. Run:  uvicorn main:app --reload --port 8000
echo ============================================
pause