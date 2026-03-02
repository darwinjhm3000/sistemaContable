@echo off
echo ============================================
echo VALIDACION DE BASE DE DATOS
echo ============================================
echo.

cd /d %~dp0

echo Ejecutando validacion...
echo.

npx ts-node validar-db.ts

pause

