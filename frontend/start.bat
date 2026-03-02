@echo off
echo ============================================
echo Iniciando Frontend React
echo ============================================
echo.

cd /d %~dp0

echo Verificando Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js no esta instalado
    echo Por favor instala Node.js desde https://nodejs.org/
    pause
    exit /b 1
)

echo Verificando dependencias...
if not exist "node_modules\" (
    echo Instalando dependencias...
    call npm install
    if errorlevel 1 (
        echo ERROR: No se pudieron instalar las dependencias
        pause
        exit /b 1
    )
)

echo.
echo Iniciando aplicacion React...
echo El navegador se abrira automaticamente
echo Presiona Ctrl+C para detener la aplicacion
echo.

call npm start

pause

