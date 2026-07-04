@echo off
setlocal
cd /d "%~dp0"
title elastic-space local server
echo elastic-space local server
echo.
echo URL: http://127.0.0.1:4173/
echo Health: http://127.0.0.1:4173/healthz
echo.
echo Leave this window open while using the site.
echo Press Ctrl+C to stop the server.
echo.
node server.mjs
