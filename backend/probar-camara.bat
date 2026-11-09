@echo off
rem Abre la camara en una ventana y muestra las placas que lee, SIN registrarlas en AxPark.
rem Pulsa Q en la ventana de video para salir.
title AxPark - prueba de camara
cd /d "%~dp0"
set PYTHONIOENCODING=utf-8
set "TAPO_IP="
if exist ".env" for /f "usebackq tokens=1,* delims==" %%a in (".env") do if "%%a"=="TAPO_IP" set "TAPO_IP=%%b"
if not defined TAPO_IP (
  echo [ERROR] Ejecuta primero instalar-detector.bat
  pause
  exit /b 1
)
set "PY=.venv\Scripts\python.exe"
if not exist "%PY%" set "PY=python"
"%PY%" detector_placas.py --tapo %TAPO_IP% --sin-api
pause
