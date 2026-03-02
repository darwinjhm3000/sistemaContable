@echo off
echo ============================================
echo VERIFICACION DE INSTALACION
echo ============================================
echo.

cd /d %~dp0

echo [1/4] Verificando Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js NO esta instalado
    echo    Descarga desde: https://nodejs.org/
    pause
    exit /b 1
) else (
    echo ✅ Node.js instalado
    node --version
)

echo.
echo [2/4] Verificando npm...
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ npm NO esta instalado
    pause
    exit /b 1
) else (
    echo ✅ npm instalado
    npm --version
)

echo.
echo [3/4] Verificando dependencias...
if not exist "node_modules\" (
    echo ⚠️  Dependencias NO instaladas
    echo    Ejecutando: npm install
    echo.
    call npm install
    if errorlevel 1 (
        echo ❌ Error al instalar dependencias
        pause
        exit /b 1
    )
) else (
    echo ✅ Dependencias instaladas
)

echo.
echo [4/4] Verificando archivos del proyecto...
if not exist "src\server.ts" (
    echo ❌ No se encuentra src\server.ts
    pause
    exit /b 1
) else (
    echo ✅ Archivos del proyecto encontrados
)

echo.
echo ============================================
echo ✅ VERIFICACION COMPLETA
echo ============================================
echo.
echo Ahora puedes ejecutar:
echo   npm run dev
echo.
echo O usar: start.bat
echo.
pause

