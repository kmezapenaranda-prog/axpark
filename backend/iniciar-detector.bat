@echo off
rem Arranca el detector de placas de AxPark (sin ventana de video) y lo reinicia
rem solo si se cierra por un error. Para detenerlo: cierra esta ventana o pulsa Ctrl+C.
title AxPark detector
cd /d "%~dp0"
set PYTHONUNBUFFERED=1
set PYTHONIOENCODING=utf-8

set "TAPO_IP="
if not exist ".env" (
  echo [ERROR] Falta la configuracion. Ejecuta primero instalar-detector.bat
  pause
  exit /b 1
)
for /f "usebackq tokens=1,* delims==" %%a in (".env") do if "%%a"=="TAPO_IP" set "TAPO_IP=%%b"
if not defined TAPO_IP (
  echo [ERROR] No hay IP de camara en .env. Ejecuta de nuevo instalar-detector.bat
  pause
  exit /b 1
)

set "PY=.venv\Scripts\python.exe"
if not exist "%PY%" set "PY=python"

:bucle
echo.
echo [%date% %time%] Iniciando detector - camara %TAPO_IP%
"%PY%" detector_placas.py --tapo %TAPO_IP% --headless
echo [%date% %time%] El detector se cerro (codigo %errorlevel%). Reiniciando en 15 segundos...
timeout /t 15 /nobreak >nul
goto bucle
