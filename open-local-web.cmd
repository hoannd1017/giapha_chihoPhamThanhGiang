@echo off
cd /d %~dp0
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0open-local-web.ps1"
exit /b
