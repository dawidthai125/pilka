@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo ============================================
echo  IMPORT STATYSTYK z mPZPN (bez tokenu)
echo ============================================
echo.
echo 1) Chrome: F12 -^> Siec -^> GET .../players (200)
echo 2) GET .../players -^> ODPOWIEDZ -^> Copy response
echo 3) Zapisz jako: fixtures\league\live\mpzpn-response.json
echo.
echo OPCJONALNIE (bramki): na stronie strzelcow w Sieci
echo    znajdz GET z "points" lub "stats" -^> mpzpn-stats.json
echo    potem: node scripts\lnp-merge-stats-json.mjs
echo.
pause
echo.
echo Import...
node scripts\lnp-import-players-json.mjs
if errorlevel 1 (
  echo.
  echo BLAD importu - sprawdz czy plik JSON jest zapisany.
  pause
  exit /b 1
)
echo.
echo Sync do bazy...
node scripts\sync-league-live.mjs
echo.
pause
