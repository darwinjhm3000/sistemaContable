@echo off
echo ============================================
echo 🔄 REINICIANDO SERVICIOS DEL SISTEMA
echo ============================================
echo.

echo 🛑 Deteniendo procesos existentes...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul
echo ✅ Procesos detenidos
echo.

cd /d %~dp0backend

echo 🔨 Compilando backend...
call npm run build
if errorlevel 1 (
    echo ❌ Error al compilar backend
    pause
    exit /b 1
)
echo ✅ Backend compilado
echo.

echo 🚀 Iniciando backend...
echo    Puerto: 3001
echo    URL: http://localhost:3001
echo    Zona Horaria: America/Bogota (UTC-5)
echo.
start "Backend - Sistema Contable" cmd /k "set TZ=America/Bogota && npm start"
echo ✅ Backend iniciado en nueva ventana
echo.

cd /d %~dp0frontend

echo 🔨 Verificando frontend...
if exist "build\index.html" (
    echo ✅ Frontend ya compilado
) else (
    echo 🔨 Compilando frontend...
    call npm run build
    if errorlevel 1 (
        echo ❌ Error al compilar frontend
        pause
        exit /b 1
    )
    echo ✅ Frontend compilado
)
echo.

echo 🚀 Iniciando frontend...
echo    Puerto: 3000
echo    URL: http://localhost:3000
echo.
start "Frontend - Sistema Contable" cmd /k "npm start"
echo ✅ Frontend iniciado en nueva ventana
echo.

echo ============================================
echo ✅ SERVICIOS INICIADOS
echo ============================================
echo.
echo 📋 Resumen:
echo    • Backend:  http://localhost:3001
echo    • Frontend: http://localhost:3000
echo    • Zona Horaria: America/Bogota (UTC-5)
echo.
echo ⏳ Espera 10-15 segundos para que los servicios
echo    inicien completamente antes de usar la aplicacion
echo.
echo 💡 Verifica las ventanas abiertas para ver los logs
echo.
pause

