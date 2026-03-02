@echo off
echo ============================================
echo Iniciando Sistema Contable
echo ============================================
echo.

cd /d %~dp0

echo [1/2] Iniciando Backend...
start "Backend - Sistema Contable" cmd /k "cd backend && npm run dev"

timeout /t 3 /nobreak >nul

echo [2/2] Iniciando Frontend...
start "Frontend - Sistema Contable" cmd /k "cd frontend && npm start"

echo.
echo ============================================
echo Servicios iniciados!
echo ============================================
echo.
echo Backend:  http://localhost:3001
echo Frontend: http://localhost:3000
echo.
echo Las ventanas de comandos permaneceran abiertas.
echo Cierra las ventanas para detener los servicios.
echo.
pause

