@echo off
setlocal
cd /d "%~dp0"

rem Elastic Space map room launcher.
rem Double-click: starts the dev server in its own CMD window (if it is not
rem already running), waits for it to answer, then opens the map room.
rem Close the server window (or Ctrl+C in it) to stop the server.

curl.exe -s -o NUL --max-time 2 "http://127.0.0.1:4174/healthz"
if not errorlevel 1 goto open

start "elastic-space server (port 4174)" cmd /k "set ELASTIC_SPACE_PORT=4174&& node server.mjs"

set tries=0
:wait
set /a tries+=1
curl.exe -s -o NUL --max-time 1 "http://127.0.0.1:4174/healthz"
if not errorlevel 1 goto open
if %tries% geq 20 goto open
ping 127.0.0.1 -n 2 >nul
goto wait

:open
start "" "http://127.0.0.1:4174/"
endlocal
