@echo off
echo ============================================
echo 📋 EJECUTANDO ACTUALIZACION DIAN RESOLUCION 000085
echo ============================================
echo.

echo 🔧 Ejecutando script SQL para agregar campos DIAN...
echo.

sqlcmd -S DESKTOP-PTP75MU -d MiBaseDeContabilidad -U sistema_contable -P SistemaContable2024! -i "database\actualizar-facturas-dian-85.sql"

if errorlevel 1 (
    echo.
    echo ❌ Error al ejecutar el script SQL
    echo.
    echo 💡 Asegúrate de:
    echo    1. Que SQL Server esté corriendo
    echo    2. Que las credenciales sean correctas
    echo    3. Que la base de datos exista
    echo.
    pause
    exit /b 1
)

echo.
echo ✅ Script SQL ejecutado exitosamente
echo.
echo 📝 Próximos pasos:
echo    1. Recompilar el backend: cd backend ^&^& npm run build
echo    2. Reiniciar el backend: npm start
echo    3. Las facturas ahora generarán CUFE y QR Code automáticamente
echo.
pause

