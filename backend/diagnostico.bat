@echo off
echo ============================================
echo DIAGNOSTICO DEL SERVIDOR
echo ============================================
echo.

cd /d %~dp0

echo [PASO 1] Verificando Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ ERROR: Node.js no esta instalado
    echo    Instala desde: https://nodejs.org/
    goto :end
) else (
    echo ✅ Node.js OK
    node --version
)

echo.
echo [PASO 2] Verificando puerto 3001...
netstat -ano | findstr ":3001" >nul 2>&1
if errorlevel 1 (
    echo ✅ Puerto 3001 disponible
) else (
    echo ⚠️  ADVERTENCIA: Puerto 3001 esta en uso
    echo    Esto puede causar problemas
    netstat -ano | findstr ":3001"
)

echo.
echo [PASO 3] Verificando dependencias...
if not exist "node_modules\" (
    echo ❌ Dependencias NO instaladas
    echo    Ejecuta: npm install
    goto :end
) else (
    echo ✅ Dependencias instaladas
)

echo.
echo [PASO 4] Probando servidor HTTP basico...
echo    Ejecutando test-server.js...
echo.
timeout /t 2 >nul
start /B node test-server.js
timeout /t 3 >nul

curl -s http://localhost:3001 >nul 2>&1
if errorlevel 1 (
    echo ❌ El servidor HTTP basico NO responde
    echo    Hay un problema con el puerto o permisos
) else (
    echo ✅ Servidor HTTP basico funciona
    echo    Abre en el navegador: http://localhost:3001
)

echo.
echo [PASO 5] Verificando TypeScript...
npx tsc --version >nul 2>&1
if errorlevel 1 (
    echo ⚠️  TypeScript no encontrado (se instalara automaticamente)
) else (
    echo ✅ TypeScript OK
    npx tsc --version
)

echo.
echo ============================================
echo DIAGNOSTICO COMPLETO
echo ============================================
echo.
echo Si todo esta OK, ejecuta:
echo   npm run dev
echo.
echo Si hay errores, revisa los mensajes arriba
echo.

:end
pause

