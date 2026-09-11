@echo off
title Mu Manager PRO - Conector de Servidor
color 0B
cd /d "%~dp0"

:inicio
cls
echo ================================================================
echo   MU MANAGER PRO - CONECTOR SEGURO SQL SERVER (PUERTO 3001)
echo ================================================================
echo.

:: 1. Verificar si Node.js esta instalado
where node >nul 2>nul
if %errorlevel% neq 0 (
    if exist "%ProgramFiles%\nodejs\node.exe" (
        set "PATH=%ProgramFiles%\nodejs;%PATH%"
        goto node_ok
    )
    if exist "%ProgramFiles(x86)%\nodejs\node.exe" (
        set "PATH=%ProgramFiles(x86)%\nodejs;%PATH%"
        goto node_ok
    )
    color 0E
    echo [!] Node.js no esta instalado en este servidor/VPS.
    echo.
    echo Node.js es necesario para que este conector pueda comunicar
    echo la aplicacion movil con la base de datos SQL Server.
    echo.
    echo ----------------------------------------------------------------
    echo   OPCIONES DISPONIBLES:
    echo ----------------------------------------------------------------
    echo   [1] Descargar e instalar Node.js AUTOMATICAMENTE (Recomendado)
    echo   [2] Abrir la pagina web oficial para descargar Node.js manual
    echo   [3] Salir
    echo ----------------------------------------------------------------
    echo.
    set /p opt="Selecciona una opcion [1, 2 o 3] y presiona Enter: "
    if "%opt%"=="1" goto autoinstall
    if "%opt%"=="2" (
        start https://nodejs.org/
        echo.
        echo Se ha abierto el navegador. Una vez instalado Node.js,
        echo presiona cualquier tecla para continuar...
        pause >nul
        goto inicio
    )
    exit /b 1
)

:node_ok
color 0B
:: 2. Habilitar puertos 3001 y 30001 en el Firewall de Windows automaticamente
echo [1/3] Verificando reglas de Firewall para puertos 3001 y 30001...
netsh advfirewall firewall add rule name="MuManager Connector 3001" dir=in action=allow protocol=TCP localport=3001 >nul 2>&1
netsh advfirewall firewall add rule name="MuManager Connector 30001" dir=in action=allow protocol=TCP localport=30001 >nul 2>&1

:: 3. Verificar dependencias
echo [2/3] Verificando dependencias npm...
if not exist "node_modules" (
    echo Instalando librerias necesarias (solo la primera vez)...
    call npm install
)

:: 4. Iniciar servicio
echo [3/3] Iniciando conector en puerto 3001...
echo.
echo ================================================================
echo   [OK] CONECTOR ACTIVO Y LISTO
echo   Puerto: 3001 (y 30001)
echo   Ya puedes conectar desde la app movil ingresando la IP del VPS.
echo.
echo   MANTEN ESTA VENTANA ABIERTA MIENTRAS USES LA APP.
echo ================================================================
echo.
node server.js
pause
exit /b 0

:autoinstall
cls
color 0A
echo ================================================================
echo   INSTALANDO NODE.JS AUTOMATICAMENTE EN ESTE SERVIDOR
echo ================================================================
echo.
echo Descargando instalador oficial de Node.js LTS (por favor espera unos segundos)...
powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $wc = New-Object Net.WebClient; $wc.DownloadFile('https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi', '$env:TEMP\nodejs_setup.msi')"

if not exist "%TEMP%\nodejs_setup.msi" (
    color 0C
    echo.
    echo [ERROR] No se pudo descargar automaticamente debido a politicas de red.
    echo Abriendo pagina web oficial de Node.js en el navegador...
    start https://nodejs.org/
    echo Por favor descargalo manualmente y presiona cualquier tecla al terminar.
    pause >nul
    goto inicio
)

echo.
echo Instalando Node.js (tardara unos 15 segundos)...
msiexec /i "%TEMP%\nodejs_setup.msi" /passive /norestart
del "%TEMP%\nodejs_setup.msi" >nul 2>&1

set "PATH=%ProgramFiles%\nodejs;%ProgramFiles(x86)%\nodejs;%PATH%"
echo.
echo [OK] Node.js ha sido instalado correctamente!
timeout /t 3 >nul
goto inicio
