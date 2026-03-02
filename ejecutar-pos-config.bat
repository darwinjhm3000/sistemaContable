@echo off
echo ============================================
echo 🚀 EJECUTANDO CONFIGURACION POS
echo ============================================
echo.

echo 📋 Ejecutando script SQL para crear tabla ConfiguracionPOS...
echo.

cd /d %~dp0

sqlcmd -S DESKTOP-PTP75MU -d MiBaseDeContabilidad -U sistema_contable -P SistemaContable2024! -i "backend\scripts\create-pos-config-table.sql" -o "backend\scripts\create-pos-config-table.log"

if errorlevel 1 (
    echo ❌ Error al ejecutar script SQL
    echo.
    echo Revisa el archivo: backend\scripts\create-pos-config-table.log
    pause
    exit /b 1
) else (
    echo ✅ Script SQL ejecutado correctamente
    echo.
    echo Revisa el log en: backend\scripts\create-pos-config-table.log
    echo.
)

pause

