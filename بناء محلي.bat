@echo off
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "%~dpn0.ps1"
pause