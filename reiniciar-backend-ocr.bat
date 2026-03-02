@echo off
echo ============================================
echo 🔄 REINICIANDO BACKEND PARA OCR
echo ============================================
echo.

cd /d %~dp0backend

echo 🔨 Recompilando backend...
call npm run build
if errorlevel 1 (
    echo ❌ Error al compilar
    pause
    exit /b 1
)
echo ✅ Compilación exitosa
echo.

echo ⚠️  IMPORTANTE: Debes detener el backend actual primero
echo     Presiona Ctrl+C en la terminal donde corre el backend
echo     Luego presiona cualquier tecla aquí para continuar...
pause
echo.

echo 🚀 Iniciando servidor backend...
echo    Puerto: 3001
echo    URL: http://localhost:3001
echo    Endpoint OCR: POST http://localhost:3001/api/compras/scan-pdf
echo.
echo ⏳ Espera 5-10 segundos para que inicie completamente
echo.

call npm start

pause

