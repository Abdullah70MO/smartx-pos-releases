@echo off
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "version-bump.ps1"
pause
