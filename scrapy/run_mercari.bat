@echo off
REM ============================================================================
REM  run_mercari.bat  --  Mercari market-price trend: daily scheduled job
REM
REM  Steps: 1) build card-number list  -> cards.json
REM         2) scrape Mercari sold-out median prices -> mercariData\{product}.json
REM         3) upload mercariData\ to the GCS bucket
REM
REM  Log:   logs\mercari_YYYYMMDD.log
REM  Note:  content is ASCII-only on purpose. cmd.exe reads .bat in the OEM code
REM         page, so CJK text here would corrupt parsing. Keep it ASCII.
REM  Schedule: see the schtasks command at the bottom of this file.
REM ============================================================================

setlocal EnableDelayedExpansion

REM ---- Config (edit these) ---------------------------------------------------
REM Project folder (this .bat's own directory; usually leave as-is)
set "PROJECT_DIR=%~dp0"

REM Python executable (use full path if not on PATH, e.g. C:\Python312\python.exe)
set "PYTHON=python"

REM Products to track (repeat --product). Space-separated.
set "PRODUCTS=--product BD/W54 --product BD/W73"

REM Only these rarity suffixes (high-value cards). Clear the line to include all.
set "SUFFIXES=--include-suffix SSP --include-suffix SP --include-suffix SEC"

REM Search keyword source: name = by card name (more hits), number = by card no,
REM auto = name when available. Sellers rarely put the card number, so name wins.
set "SEARCH_BY=name"

REM Result filter (seller title patterns, by frequency: name+rarity > name-only
REM > name+desc-number > name+number):
REM   rarity = keep titles with the card number OR the rarity token (recommended:
REM            catches the most common "name+rarity" listings, drops ambiguous
REM            name-only ones)
REM   loose  = keep everything (max volume, but same-name rarities get blended)
REM   number = only titles containing the full card number (rarest pattern)
set "MATCH=rarity"

REM Seconds between per-card requests (larger = safer against rate limits)
set "DELAY=2"

REM Days to look back / backfill overlap (avoids gaps between runs)
set "DAYS=3"

REM Upload destination: bucket path the web page fetches from
set "GCS_DEST=gs://divine-vehicle-292507.appspot.com/json/mercariData"

REM Set to 1 for local testing (scrape only, skip the upload step)
set "SKIP_UPLOAD=0"
REM ---------------------------------------------------------------------------

cd /d "%PROJECT_DIR%"

REM Prepare a date-stamped log file
if not exist "logs" mkdir "logs"
for /f "usebackq" %%i in (`powershell -NoProfile -Command "Get-Date -Format yyyyMMdd"`) do set "TODAY=%%i"
set "LOG=logs\mercari_%TODAY%.log"

call :log "==================== RUN START ===================="

REM ---- Step 1: build the card list ------------------------------------------
call :log "[1/3] Building cards.json (with names) ..."
"%PYTHON%" make_cards_list.py %PRODUCTS% %SUFFIXES% --with-name --out cards.json --delay %DELAY% >> "%LOG%" 2>&1
if errorlevel 1 (
    call :log "[1/3] FAILED: make_cards_list.py returned an error. Aborting."
    goto :end
)

REM ---- Step 2: scrape market prices -----------------------------------------
call :log "[2/3] Scraping Mercari sold medians (search=%SEARCH_BY%, match=%MATCH%, delay=%DELAY%, days=%DAYS%) ..."
"%PYTHON%" mercari_scraper.py --market --cards-file cards.json --search-by %SEARCH_BY% --match %MATCH% --days %DAYS% --delay %DELAY% >> "%LOG%" 2>&1
if errorlevel 1 (
    call :log "[2/3] FAILED: mercari_scraper.py returned an error. Aborting, no upload."
    goto :end
)

REM ---- Step 3: upload to GCS ------------------------------------------------
if "%SKIP_UPLOAD%"=="1" (
    call :log "[3/3] Skipping upload (SKIP_UPLOAD=1)."
    goto :done
)
call :log "[3/3] Uploading mercariData\ -> %GCS_DEST% ..."
call gsutil -m rsync -r mercariData "%GCS_DEST%" >> "%LOG%" 2>&1
if errorlevel 1 (
    call :log "[3/3] FAILED: gsutil upload error. Check Google Cloud SDK is installed and logged in."
    goto :end
)

:done
call :log "==================== RUN OK ===================="
goto :eof

:end
call :log "==================== RUN ABORTED (errors) ===================="
goto :eof

REM ---- logging helper: writes to console and log with a timestamp -----------
:log
echo [%date% %time%] %~1
echo [%date% %time%] %~1>> "%LOG%"
goto :eof

REM ============================================================================
REM  Register as a daily task (run once; works in both cmd and PowerShell):
REM
REM    schtasks /create /tn "MercariTrend" /sc daily /st 04:30 /tr "c:\Users\perrychiou\Desktop\ws\ws-cards.github.io\run_mercari.bat"
REM
REM  Runs this .bat every day at 04:30. Change /st for a different time.
REM  Remove with:  schtasks /delete /tn "MercariTrend" /f
REM  Test now with: run_mercari.bat   (or set SKIP_UPLOAD=1 first to skip upload)
REM ============================================================================
