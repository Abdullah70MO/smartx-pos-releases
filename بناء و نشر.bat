@echo off
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "publish.ps1"
pause
