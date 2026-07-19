@echo off
setlocal
cd /d "%~dp0"

rem Elastic Space launcher — the ONE way to start this project.
rem Double-click: reuses the server if it is already running on port 4174,
rem otherwise starts it in its own minimized CMD window, waits for it to
rem answer, then opens the map room. The server window sits minimized in
rem the taskbar — close it to stop the server.

rem Minimize this launcher window (PowerShell shares the console).
powershell -window minimized -command ""

curl.exe -s -o NUL --max-time 2 "http://127.0.0.1:4174/healthz"
if not errorlevel 1 goto open

start /min "elastic-space server (port 4174)" cmd /c "node server.mjs"

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
