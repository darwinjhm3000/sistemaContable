# 🚀 Guía para Iniciar los Servicios

## Estado Actual

- ✅ **Backend**: Corriendo en `http://localhost:3001`
- ⚠️ **Frontend**: Debe iniciarse manualmente

## Iniciar Frontend

### Opción 1: Desde PowerShell (Recomendado)

```powershell
cd frontend
npm start
```

### Opción 2: Desde la raíz del proyecto

```powershell
cd frontend
npm start
```

## Tiempo de Compilación

El frontend puede tardar **30-60 segundos** en compilar y estar disponible.

### Señales de que está listo:

1. Verás el mensaje: `Compiled successfully!`
2. El navegador se abrirá automáticamente en `http://localhost:3000`
3. Puedes verificar manualmente: `http://localhost:3000`

## Verificar Estado de los Servicios

### Frontend
```powershell
Invoke-WebRequest -Uri http://localhost:3000 -UseBasicParsing -TimeoutSec 3
```

### Backend
```powershell
Invoke-WebRequest -Uri http://localhost:3001/api/health -UseBasicParsing -TimeoutSec 3
```

## Solución de Problemas

### Si el frontend no inicia:

1. **Verificar que Node.js esté instalado:**
   ```powershell
   node --version
   npm --version
   ```

2. **Limpiar e instalar dependencias:**
   ```powershell
   cd frontend
   rm -r node_modules
   npm install
   npm start
   ```

3. **Verificar que el puerto 3000 esté libre:**
   ```powershell
   netstat -ano | findstr ":3000"
   ```

4. **Si el puerto está ocupado, detener el proceso:**
   ```powershell
   # Encontrar el PID
   netstat -ano | findstr ":3000"
   # Detener el proceso (reemplazar PID con el número)
   taskkill /PID <PID> /F
   ```

### Si el backend no responde:

1. **Reiniciar el backend:**
   ```powershell
   cd backend
   npm start
   ```

2. **Verificar la conexión a la base de datos:**
   ```powershell
   cd backend
   npm run validar-db
   ```

## Script de Inicio Rápido

Puedes crear un script `iniciar-servicios.ps1`:

```powershell
# Iniciar Backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; npm start"

# Esperar 5 segundos
Start-Sleep -Seconds 5

# Iniciar Frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npm start"

Write-Host "✅ Servicios iniciados" -ForegroundColor Green
Write-Host "   Backend: http://localhost:3001" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:3000 (compilando...)" -ForegroundColor Cyan
```

---

**Nota**: El frontend necesita compilar antes de estar disponible. Espera 30-60 segundos después de ejecutar `npm start`.

