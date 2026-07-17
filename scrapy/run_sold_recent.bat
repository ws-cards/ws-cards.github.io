@echo off
REM ============================================================================
REM  run_sold_recent.bat  --  Mercari: export items SOLD within the last N days
REM
REM  Runs mercari_scraper.py in --sold-recent mode: collects sold-out (closed)
REM  listings whose sale time (updated) falls within the last N days, then
REM  writes the result to CSV + JSON.
REM
REM  Output: %OUT%.csv / %OUT%.json
REM  Log:    logs\sold_recent_YYYYMMDD.log
REM  Note:   content is ASCII-only on purpose. cmd.exe reads .bat in the OEM code
REM          page, so CJK text here would corrupt parsing. Keep it ASCII.
REM  Schedule: see the schtasks command at the bottom of this file.
REM ============================================================================

setlocal EnableDelayedExpansion

REM ---- Config (edit these) ---------------------------------------------------
REM Project folder (this .bat's own directory; usually leave as-is)
set "PROJECT_DIR=%~dp0"

REM Python executable (use full path if not on PATH, e.g. C:\Python312\python.exe)
set "PYTHON=python"

REM Category ID (1293 = Weiss Schwarz)
set "CATEGORY_ID=1293"

REM How many days back to look for sold records
set "DAYS=30"

REM Search keyword: empty = whole category. Set a card number or name to narrow.
REM   Example: set "KEYWORD=BD/W54-070"
set "KEYWORD="

REM Max pages to page through, and seconds between requests (larger = safer)
set "MAX_PAGES=40"
set "DELAY=1"

REM Output file base name (no extension; .csv and .json are created)
set "OUT=mercari_sold_30d"
REM ---------------------------------------------------------------------------

cd /d "%PROJECT_DIR%"

REM Prepare a date-stamped log file
if not exist "logs" mkdir "logs"
for /f "usebackq" %%i in (`powershell -NoProfile -Command "Get-Date -Format yyyyMMdd"`) do set "TODAY=%%i"
set "LOG=logs\sold_recent_%TODAY%.log"

call :log "==================== RUN START ===================="

REM Build the keyword argument only when KEYWORD is non-empty
set "KEYWORD_ARG="
if not "%KEYWORD%"=="" set "KEYWORD_ARG=--keyword "%KEYWORD%""

call :log "Scraping sold records: category=%CATEGORY_ID%, days=%DAYS%, keyword='%KEYWORD%', delay=%DELAY% ..."
"%PYTHON%" mercari_scraper.py --sold-recent --category-id %CATEGORY_ID% --days %DAYS% %KEYWORD_ARG% --max-pages %MAX_PAGES% --delay %DELAY% --out "%OUT%" >> "%LOG%" 2>&1
if errorlevel 1 (
    call :log "FAILED: mercari_scraper.py returned an error. See the log above."
    goto :end
)

call :log "OK: results written to %OUT%.csv / %OUT%.json"
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
REM  Run now:
REM
REM    run_sold_recent.bat
REM
REM  Register as a daily task (run once; works in both cmd and PowerShell):
REM
REM    schtasks /create /tn "MercariSold30d" /sc daily /st 05:00 /tr "c:\Users\perrychiou\Desktop\ws\ws-cards.github.io\scrapy\run_sold_recent.bat"
REM
REM  Runs this .bat every day at 05:00. Change /st for a different time.
REM  Remove with:  schtasks /delete /tn "MercariSold30d" /f
REM ============================================================================
