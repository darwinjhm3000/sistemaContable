@echo off
echo ============================================
echo 🚀 INICIANDO BACKEND
echo ============================================
echo.

cd /d %~dp0backend

echo 🔨 Verificando compilacion...
if not exist "dist\server.js" (
    echo ⚠️  Backend no compilado. Compilando...
    call npm run build
    if errorlevel 1 (
        echo ❌ Error al compilar
        pause
        exit /b 1
    )
    echo ✅ Compilacion exitosa
)

echo.
echo 🚀 Iniciando servidor backend...
echo    Puerto: 3001
echo    URL: http://localhost:3001
echo    Zona Horaria: America/Bogota (UTC-5)
echo.
echo ⏳ Espera 5-10 segundos para que inicie completamente
echo.

REM Establecer zona horaria de Bogotá
set TZ=America/Bogota

call npm start

pause

