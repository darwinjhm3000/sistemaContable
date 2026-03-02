@echo off
echo ============================================
echo Crear Base de Datos - Sistema Contable
echo ============================================
echo.

REM Verificar que sqlcmd esté disponible
sqlcmd -? >nul 2>&1
if errorlevel 1 (
    echo ERROR: sqlcmd no esta disponible
    echo Por favor, instala SQL Server Command Line Utilities
    echo O ejecuta este script desde SQL Server Management Studio (SSMS)
    pause
    exit /b 1
)

echo [1/2] Creando estructura de base de datos...
echo.
sqlcmd -S DESKTOP-PTP75MU -E -i "%~dp0schema.sql"
if errorlevel 1 (
    echo ERROR: No se pudo ejecutar el script de estructura
    pause
    exit /b 1
)

echo.
echo [2/2] Insertando datos iniciales...
echo.
sqlcmd -S DESKTOP-PTP75MU -E -i "%~dp0datos-iniciales.sql" -d MiBaseDeContabilidad
if errorlevel 1 (
    echo ERROR: No se pudo ejecutar el script de datos
    pause
    exit /b 1
)

echo.
echo ============================================
echo ✅ Base de datos creada exitosamente!
echo ============================================
echo.
echo Usuarios de prueba:
echo   Usuario: admin      Contraseña: admin123
echo   Usuario: contador   Contraseña: contador123
echo.
pause


