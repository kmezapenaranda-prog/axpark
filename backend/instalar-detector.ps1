# Instalador del detector de placas de AxPark para Windows.
# Se ejecuta con doble clic en instalar-detector.bat. Pasos:
#   1. Comprueba Python (3.10 a 3.12).
#   2. Crea un entorno aislado (.venv) e instala las dependencias.
#   3. Pide la clave del detector y los datos de la camara, y los guarda en .env (solo en este PC).
#   4. Comprueba que la clave funcione contra AxPark.
#   5. Programa el arranque automatico al iniciar sesion en Windows.
# Los parametros permiten ejecutarlo sin preguntas (pruebas o instalaciones repetidas).

param(
    [string]$Clave,
    [string]$IpCamara,
    [string]$UsuarioCamara,
    [string]$ClaveCamara,
    [string]$ApiUrl = "https://api-axpark.axonsia.com",
    [switch]$SinInstalarDependencias,
    [switch]$SinInicioAutomatico
)

$ErrorActionPreference = "Stop"
$Carpeta = $PSScriptRoot
$EnvFile = Join-Path $Carpeta ".env"

function Paso($texto) { Write-Host ""; Write-Host "== $texto" -ForegroundColor Cyan }
function Ok($texto) { Write-Host "   [OK] $texto" -ForegroundColor Green }
function Aviso($texto) { Write-Host "   [!] $texto" -ForegroundColor Yellow }
function Falla($texto) {
    Write-Host ""
    Write-Host "   [ERROR] $texto" -ForegroundColor Red
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "  AxPark - Instalacion del detector de placas" -ForegroundColor White
Write-Host "  -------------------------------------------"

# --- 1. Python ---------------------------------------------------------------
Paso "1/5  Buscando Python"
$Python = $null
foreach ($cand in @(@("py", "-3.11"), @("py", "-3.12"), @("py", "-3.10"), @("python"))) {
    try {
        $args0 = @()
        if ($cand.Length -gt 1) { $args0 = $cand[1..($cand.Length - 1)] }
        $ver = & $cand[0] @args0 -c "import sys; print('%d.%d' % sys.version_info[:2])" 2>$null
        if ($LASTEXITCODE -eq 0 -and $ver -match '^3\.(10|11|12)$') { $Python = $cand; break }
    } catch { }
}
if (-not $Python) {
    Falla ("No encontre Python 3.10, 3.11 o 3.12.`n" +
           "   Instala Python 3.11 desde https://www.python.org/downloads/`n" +
           "   y marca la casilla 'Add Python to PATH'. Luego vuelve a ejecutar este instalador.")
}
Ok ("Python " + $ver)

# --- 2. Entorno e instalacion ------------------------------------------------
$VenvPython = Join-Path $Carpeta ".venv\Scripts\python.exe"
if ($SinInstalarDependencias) {
    Paso "2/5  Dependencias (omitido)"
} else {
    Paso "2/5  Instalando lo necesario (puede tardar 5-15 minutos la primera vez)"
    if (-not (Test-Path $VenvPython)) {
        $args0 = @()
        if ($Python.Length -gt 1) { $args0 = $Python[1..($Python.Length - 1)] }
        & $Python[0] @args0 -m venv (Join-Path $Carpeta ".venv")
        if ($LASTEXITCODE -ne 0) { Falla "No se pudo crear el entorno de Python (.venv)." }
    }
    & $VenvPython -m pip install --upgrade pip --quiet
    & $VenvPython -m pip install -r (Join-Path $Carpeta "requirements.txt")
    if ($LASTEXITCODE -ne 0) { Falla "Fallo la instalacion de dependencias. Revisa tu conexion a internet y vuelve a intentarlo." }
    Ok "Dependencias instaladas"
}

# --- 3. Datos ----------------------------------------------------------------
Paso "3/5  Datos del detector y de la camara"
if ((Test-Path $EnvFile) -and -not $Clave) {
    $resp = Read-Host "   Ya hay una configuracion guardada. Reemplazarla? (s/n)"
    if ($resp -notmatch '^[sS]') { Aviso "Se mantiene la configuracion actual."; $Mantener = $true }
}
if (-not $Mantener) {
    if (-not $Clave) {
        Write-Host "   La clave se crea en AxPark: tu parqueadero -> Detectores de placas -> Nuevo detector."
        $Clave = Read-Host "   Clave del detector (empieza por axp_)"
    }
    $Clave = $Clave.Trim()
    if (-not $Clave.StartsWith("axp_")) { Falla "La clave del detector debe empezar por axp_. Copiala de nuevo desde el panel." }

    if (-not $IpCamara) { $IpCamara = Read-Host "   IP de la camara (app Tapo -> Informacion del dispositivo)" }
    $IpCamara = $IpCamara.Trim()
    if ($IpCamara -notmatch '^\d{1,3}(\.\d{1,3}){3}$') { Falla "La IP '$IpCamara' no es valida (ejemplo: 192.168.1.50)." }

    if (-not $UsuarioCamara) { $UsuarioCamara = Read-Host "   Usuario de la camara (app Tapo -> Cuenta de la camara)" }
    if (-not $ClaveCamara) {
        $seguro = Read-Host "   Contrasena de la camara" -AsSecureString
        $ClaveCamara = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
            [Runtime.InteropServices.Marshal]::SecureStringToBSTR($seguro))
    }

    $contenido = @(
        "# Configuracion del detector de AxPark en ESTE PC. No compartir ni subir a git.",
        "PARKING_API_URL=$ApiUrl/parking/entry",
        "DETECTOR_API_KEY=$Clave",
        "TAPO_IP=$IpCamara",
        "TAPO_USER=$($UsuarioCamara.Trim())",
        "TAPO_PASS=$ClaveCamara"
    ) -join "`r`n"
    # UTF-8 sin BOM: el detector lee el .env linea por linea
    [IO.File]::WriteAllText($EnvFile, $contenido + "`r`n", (New-Object Text.UTF8Encoding $false))
    Ok "Configuracion guardada en .env (solo en este PC)"
}

# --- 4. Comprobar clave y camara ---------------------------------------------
Paso "4/5  Comprobando conexion"
$cfg = @{}
Get-Content $EnvFile | Where-Object { $_ -match '^[A-Z_]+=' } | ForEach-Object {
    $k, $v = $_ -split '=', 2; $cfg[$k] = $v
}
$base = $cfg["PARKING_API_URL"] -replace '/parking/entry$', ''
try {
    $r = Invoke-WebRequest -Uri "$base/detectors/heartbeat" -Method Post -UseBasicParsing `
        -Headers @{ "x-detector-key" = $cfg["DETECTOR_API_KEY"] } -TimeoutSec 20
    Ok "AxPark acepto la clave del detector (aparecera 'En linea' en el panel)"
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    if ($code -eq 401 -or $code -eq 403) {
        Falla "AxPark rechazo la clave. Revisa que la copiaste completa o crea un detector nuevo en el panel."
    }
    Aviso "No pude conectar con AxPark ($base). Revisa el internet; el detector guardara las placas y las enviara cuando vuelva."
}
try {
    $tcp = New-Object Net.Sockets.TcpClient
    $async = $tcp.BeginConnect($cfg["TAPO_IP"], 554, $null, $null)
    if ($async.AsyncWaitHandle.WaitOne(3000) -and $tcp.Connected) { Ok ("La camara responde en " + $cfg["TAPO_IP"]) }
    else { Aviso ("La camara " + $cfg["TAPO_IP"] + " no responde. Revisa que este encendida y en la misma red que este PC.") }
    $tcp.Close()
} catch { Aviso ("No pude comprobar la camara " + $cfg["TAPO_IP"] + ".") }

# --- 5. Arranque automatico --------------------------------------------------
$Inicio = [Environment]::GetFolderPath("Startup")
$Lanzador = Join-Path $Inicio "AxPark detector.cmd"
if ($SinInicioAutomatico) {
    Paso "5/5  Arranque automatico (omitido)"
} else {
    Paso "5/5  Programando el arranque automatico"
    $bat = Join-Path $Carpeta "iniciar-detector.bat"
    $cmd = "@echo off`r`nstart `"AxPark detector`" /min `"$bat`"`r`n"
    [IO.File]::WriteAllText($Lanzador, $cmd, (New-Object Text.ASCIIEncoding))
    Ok "El detector arrancara solo cada vez que se inicie sesion en este PC"
    Write-Host "      (para quitarlo, borra: $Lanzador)"
}

Write-Host ""
Write-Host "  Listo." -ForegroundColor Green
Write-Host "  - Para probar que lee placas sin registrarlas:  probar-camara.bat"
Write-Host "  - Para arrancar el detector ahora:              iniciar-detector.bat"
Write-Host ""
