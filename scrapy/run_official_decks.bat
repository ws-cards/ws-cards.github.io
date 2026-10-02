@echo off
REM ============================================================================
REM  run_official_decks.bat  --  WS official prize deck recipes: weekly job
REM
REM  Steps: 1) scrape new events from ws-tcg.com/deckrecipe/recipe_prize/
REM            -> ..\json\official-decks\{PREFIX}.json + index.json
REM         2) commit the updated json so GitHub Pages serves it
REM
REM  Log:   logs\official_decks_YYYYMMDD.log
REM  Note:  content is ASCII-only on purpose (cmd.exe reads .bat in the OEM code
REM         page, so CJK text here would corrupt parsing).
REM ============================================================================

setlocal EnableDelayedExpansion

REM ---- Config (edit these) ---------------------------------------------------
set "PROJECT_DIR=%~dp0"
set "PYTHON=python"

REM Seconds between requests to ws-tcg.com (be polite)
set "DELAY=1.5"

REM Set to 1 to commit + push json\official-decks after scraping
set "AUTO_COMMIT=0"
REM ---------------------------------------------------------------------------

cd /d "%PROJECT_DIR%"
if not exist "logs" mkdir "logs"
for /f "usebackq" %%i in (`powershell -NoProfile -Command "Get-Date -Format yyyyMMdd"`) do set "TODAY=%%i"
set "LOG=logs\official_decks_%TODAY%.log"

call :log "==================== RUN START ===================="
call :log "[1/2] Scraping new prize deck recipes (delay=%DELAY%) ..."
"%PYTHON%" ws_official_decks.py --delay %DELAY% >> "%LOG%" 2>&1
if errorlevel 1 (
    call :log "[1/2] FAILED: ws_official_decks.py returned an error."
    goto :end
)

if not "%AUTO_COMMIT%"=="1" (
    call :log "[2/2] Skipping commit (AUTO_COMMIT=0). Commit ..\json\official-decks yourself."
    goto :done
)
call :log "[2/2] Committing json\official-decks ..."
cd /d "%PROJECT_DIR%.."
git add json/official-decks >> "scrapy\%LOG%" 2>&1
git diff --cached --quiet && (
    call :log "[2/2] No changes."
    goto :done
)
git commit -m "Update official prize deck recipes" >> "scrapy\%LOG%" 2>&1
git push >> "scrapy\%LOG%" 2>&1
if errorlevel 1 (
    call :log "[2/2] FAILED: git push error."
    goto :end
)

:done
call :log "==================== RUN OK ===================="
goto :eof

:end
call :log "==================== RUN ABORTED (errors) ===================="
goto :eof

:log
echo [%date% %time%] %~1
echo [%date% %time%] %~1>> "%PROJECT_DIR%%LOG%"
goto :eof

REM ============================================================================
REM  Register as a weekly task (run once):
REM    schtasks /create /tn "WSOfficialDecks" /sc weekly /d MON /st 05:00 /tr "<path>\scrapy\run_official_decks.bat"
REM  Remove with:  schtasks /delete /tn "WSOfficialDecks" /f
REM ============================================================================
