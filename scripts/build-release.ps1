<#
================================================================================
 MU MANAGER PRO - HERRAMIENTA OFICIAL DE COMPILACIÓN RELEASE Y LANZAMIENTO
================================================================================
 REGLAS ESTRICTAS DE SEGURIDAD (RULE 5 & OWASP MOBILE):
 1. Cero persistencia: las credenciales solo residen en memoria volátil de este proceso.
 2. Cero guardado en .env, gradle.properties, JSON, logs o historial.
 3. Prohibición incondicional de credenciales antiguas revocadas.
 4. Limpieza garantizada de memoria en bloque finally ante cualquier resultado.
================================================================================
#>

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "Stop"

$ProjectRoot = (Resolve-Path "$PSScriptRoot\..").Path
Set-Location $ProjectRoot

# 0. Leer versión objetivo desde version.json
$VersionJsonPath = Join-Path $ProjectRoot "version.json"
if (-not (Test-Path $VersionJsonPath)) {
    Write-Host "[ERROR CRÍTICO] version.json no existe en: $VersionJsonPath" -ForegroundColor Red
    exit 1
}

$VersionData = Get-Content $VersionJsonPath -Raw | ConvertFrom-Json
$TargetVersion = $VersionData.version
$TargetBuild = [int]$VersionData.build

Clear-Host
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "         MU MANAGER PRO -- COMPILADOR OFICIAL DE RELEASE Y PUBLICACIÓN          " -ForegroundColor Yellow
Write-Host "                     Versión Objetivo: v$TargetVersion | Build: $TargetBuild                     " -ForegroundColor Yellow
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host " [!] AVISO DE SEGURIDAD OBLIGATORIO (OWASP MOBILE & REGLA 5):" -ForegroundColor Red
Write-Host "     Las credenciales privadas residen exclusivamente en memoria volátil" -ForegroundColor Red
Write-Host "     de esta sesión y se purgan al finalizar la compilación." -ForegroundColor Red
Write-Host ""
Write-Host "--------------------------------------------------------------------------------" -ForegroundColor DarkGray

# 1. Rutas y Alias por Defecto
$DefaultStoreFile = Join-Path $ProjectRoot "android\app\mumanager-release.keystore"
$DefaultKeyAlias  = "mumanager-release-key"

# 1.1 RELEASE_STORE_FILE
Write-Host "[1/4] Ruta del almacén de claves (.keystore):" -ForegroundColor Cyan
Write-Host "      Default: $DefaultStoreFile" -ForegroundColor DarkGray
$inputStoreFile = Read-Host "      Presione Enter para usar default o ingrese ruta"
if ([string]::IsNullOrWhiteSpace($inputStoreFile)) {
    $RELEASE_STORE_FILE = $DefaultStoreFile
} else {
    $RELEASE_STORE_FILE = $inputStoreFile.Trim().Trim('"').Trim("'")
}

if (-not (Test-Path $RELEASE_STORE_FILE)) {
    Write-Host "`n[ERROR CRÍTICO] El archivo keystore no existe en: $RELEASE_STORE_FILE" -ForegroundColor Red
    exit 1
}

# 1.2 RELEASE_KEY_ALIAS
Write-Host "`n[2/4] Alias de la clave privada:" -ForegroundColor Cyan
Write-Host "      Default: $DefaultKeyAlias" -ForegroundColor DarkGray
$inputKeyAlias = Read-Host "      Presione Enter para usar default o ingrese alias"
if ([string]::IsNullOrWhiteSpace($inputKeyAlias)) {
    $RELEASE_KEY_ALIAS = $DefaultKeyAlias
} else {
    $RELEASE_KEY_ALIAS = $inputKeyAlias.Trim().Trim('"').Trim("'")
}

# 1.3 RELEASE_STORE_PASSWORD
Write-Host "`n[3/4] Contraseña del Almacén (Keystore Password):" -ForegroundColor Cyan
Write-Host "      (La entrada es oculta y no se mostrará en pantalla)" -ForegroundColor DarkGray
$secureStorePass = Read-Host -Prompt "      Ingrese contraseña" -AsSecureString
if ($null -eq $secureStorePass -or $secureStorePass.Length -eq 0) {
    Write-Host "`n[ERROR CRÍTICO] La contraseña del almacén no puede estar vacía." -ForegroundColor Red
    exit 1
}
$RELEASE_STORE_PASSWORD = [System.Net.NetworkCredential]::new('', $secureStorePass).Password

# Rechazo de credencial antigua prohibida
if ($RELEASE_STORE_PASSWORD -eq "MuManagerPro_ReleaseSec_2026*") {
    Write-Host "`n[ERROR DE SEGURIDAD] La contraseña ingresada está REVOCADA Y PROHIBIDA." -ForegroundColor Red
    exit 1
}

# 1.4 RELEASE_KEY_PASSWORD
Write-Host "`n[4/4] Contraseña de la Clave Privada (Key Password):" -ForegroundColor Cyan
$samePass = Read-Host "      ¿Usar la misma contraseña del almacén (Estándar PKCS12)? [S/n]"
if ([string]::IsNullOrWhiteSpace($samePass) -or $samePass.Trim().ToUpper() -eq "S") {
    $RELEASE_KEY_PASSWORD = $RELEASE_STORE_PASSWORD
} else {
    Write-Host "      (La entrada es oculta y no se mostrará en pantalla)" -ForegroundColor DarkGray
    $secureKeyPass = Read-Host -Prompt "      Ingrese contraseña de la clave" -AsSecureString
    if ($null -eq $secureKeyPass -or $secureKeyPass.Length -eq 0) {
        Write-Host "`n[ERROR CRÍTICO] La contraseña de la clave privada no puede estar vacía." -ForegroundColor Red
        exit 1
    }
    $RELEASE_KEY_PASSWORD = [System.Net.NetworkCredential]::new('', $secureKeyPass).Password
    if ($RELEASE_KEY_PASSWORD -eq "MuManagerPro_ReleaseSec_2026*") {
        Write-Host "`n[ERROR DE SEGURIDAD] La contraseña ingresada está REVOCADA Y PROHIBIDA." -ForegroundColor Red
        exit 1
    }
}

Write-Host "`n[OK] Los 4 campos de firma están presentes en memoria volátil." -ForegroundColor Green
Write-Host "--------------------------------------------------------------------------------" -ForegroundColor DarkGray

# 2. Validación preventiva del Keystore
Write-Host "[*] Validando apertura del keystore con las credenciales ingresadas..." -ForegroundColor Yellow
$keytoolOutput = & keytool -list -keystore $RELEASE_STORE_FILE -storepass $RELEASE_STORE_PASSWORD -alias $RELEASE_KEY_ALIAS 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "`n[ERROR DE AUTENTICACIÓN] No se pudo abrir el almacén de claves con las credenciales ingresadas." -ForegroundColor Red
    Write-Host "Verifique la contraseña de su gestor de claves." -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Almacén de claves y alias validados exitosamente." -ForegroundColor Green

# 3. Entorno de compilación protegido
try {
    $env:RELEASE_STORE_FILE     = $RELEASE_STORE_FILE
    $env:RELEASE_STORE_PASSWORD = $RELEASE_STORE_PASSWORD
    $env:RELEASE_KEY_ALIAS      = $RELEASE_KEY_ALIAS
    $env:RELEASE_KEY_PASSWORD   = $RELEASE_KEY_PASSWORD

    # 3.1 Verificaciones TypeScript y Tests
    Write-Host "`n================================================================================" -ForegroundColor Cyan
    Write-Host " [PASO 1/3] Verificando TypeScript (npm run ts:check)..." -ForegroundColor Yellow
    Write-Host "================================================================================" -ForegroundColor Cyan
    & cmd.exe /c "npm run ts:check"
    if ($LASTEXITCODE -ne 0) { throw "Fallo en verificación de TypeScript." }

    # 3.2 Compilación Gradle
    Write-Host "`n================================================================================" -ForegroundColor Cyan
    Write-Host " [PASO 2/3] Compilando APK Release con Gradle (Hermes Bytecode + R8/ProGuard)..." -ForegroundColor Yellow
    Write-Host "================================================================================" -ForegroundColor Cyan
    
    $AndroidDir = Join-Path $ProjectRoot "android"
    Push-Location $AndroidDir
    try {
        & cmd.exe /c gradlew.bat assembleRelease
        if ($LASTEXITCODE -ne 0) { throw "La compilación de Gradle falló con código $LASTEXITCODE." }
    } finally {
        Pop-Location
    }

    # 3.3 Verificación de binario compilado
    $GeneratedApk = Join-Path $ProjectRoot "android\app\build\outputs\apk\release\app-release.apk"
    if (-not (Test-Path $GeneratedApk)) {
        throw "No se encontró el APK compilado en: $GeneratedApk"
    }

    $LocalApp = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::LocalApplicationData)
    $SdkBuildTools = Join-Path $LocalApp "Android\Sdk\build-tools"
    $aaptExe = $null
    if (Test-Path $SdkBuildTools) {
        $dirs = Get-ChildItem $SdkBuildTools -Directory | Sort-Object Name -Descending
        foreach ($d in $dirs) {
            $candidate = Join-Path $d.FullName "aapt.exe"
            if (Test-Path $candidate) { $aaptExe = $candidate; break }
        }
    }

    if ($aaptExe) {
        $badging = & $aaptExe dump badging $GeneratedApk 2>&1
        $actualVersion = ""
        $actualBuild = ""
        foreach ($line in $badging) {
            if ($line -match "package:\s+name='([^']+)'\s+versionCode='([^']+)'\s+versionName='([^']+)'") {
                $actualBuild = $Matches[2]
                $actualVersion = $Matches[3]
                break
            }
        }
        Write-Host "`n[OK] Metadatos del APK inspeccionados con AAPT: v$actualVersion (Build $actualBuild)" -ForegroundColor Green
        if ($actualVersion -ne $TargetVersion -or [int]$actualBuild -ne $TargetBuild) {
            throw "El APK compilado (v$actualVersion, build $actualBuild) no coincide con version.json (v$TargetVersion, build $TargetBuild)."
        }
    }

    Write-Host "`n================================================================================" -ForegroundColor Cyan
    Write-Host " [PASO 3/3] Ejecutando Pipeline Maestro de Publicación (release-update.js)..." -ForegroundColor Yellow
    Write-Host "================================================================================" -ForegroundColor Cyan

    & node scripts/release-update.js
    if ($LASTEXITCODE -ne 0) { throw "El pipeline de publicación release-update.js finalizó con error." }

    Write-Host "`n================================================================================" -ForegroundColor Green
    Write-Host "    ¡LANZAMIENTO OFICIAL v$TargetVersion (BUILD $TargetBuild) COMPLETADO CON ÉXITO!    " -ForegroundColor Green
    Write-Host "================================================================================" -ForegroundColor Green

} catch {
    Write-Host ""
    Write-Host "================================================================================" -ForegroundColor Red
    Write-Host "                       ERROR EN EL PROCESO DE LANZAMIENTO                       " -ForegroundColor Red
    Write-Host "================================================================================" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor White
    Write-Host ""
} finally {
    # Purga estricta incondicional de memoria
    Remove-Item env:RELEASE_STORE_FILE -ErrorAction SilentlyContinue
    Remove-Item env:RELEASE_STORE_PASSWORD -ErrorAction SilentlyContinue
    Remove-Item env:RELEASE_KEY_ALIAS -ErrorAction SilentlyContinue
    Remove-Item env:RELEASE_KEY_PASSWORD -ErrorAction SilentlyContinue

    $RELEASE_STORE_FILE = $null
    $RELEASE_STORE_PASSWORD = $null
    $RELEASE_KEY_ALIAS = $null
    $RELEASE_KEY_PASSWORD = $null
    $secureStorePass = $null
    $secureKeyPass = $null

    [System.GC]::Collect()
    Write-Host "[SEGURIDAD] Credenciales de firma purgadas incondicionalmente de memoria." -ForegroundColor DarkGray
}
