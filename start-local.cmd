@echo off
setlocal
cd /d "%~dp0"
start "elastic-space local server" "%~dp0serve-local.cmd"
ping 127.0.0.1 -n 3 >nul
start "" "http://127.0.0.1:4173/"
