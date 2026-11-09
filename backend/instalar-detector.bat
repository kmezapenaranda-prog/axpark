@echo off
rem Doble clic para instalar el detector de placas de AxPark en este PC.
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0instalar-detector.ps1" %*
echo.
pause
