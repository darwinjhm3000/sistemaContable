# 🚀 Iniciar Frontend del Sistema Contable

## Problema

El frontend no está corriendo en `http://localhost:3000`, por lo que no se puede acceder a la aplicación web.

## Solución

### Opción 1: Iniciar desde la Terminal

```bash
cd frontend
npm start
```

El frontend se iniciará automáticamente y se abrirá en el navegador en `http://localhost:3000`.

### Opción 2: Usar el Script Batch (Windows)

Si existe el archivo `start.bat` en la carpeta `frontend`:

```bash
cd frontend
.\start.bat
```

### Opción 3: Verificar y Reiniciar

Si el frontend no inicia correctamente:

1. **Verificar que Node.js esté instalado**:
   ```bash
   node --version
   npm --version
   ```

2. **Instalar dependencias** (si es necesario):
   ```bash
   cd frontend
   npm install
   ```

3. **Iniciar el servidor**:
   ```bash
   npm start
   ```

## Puertos del Sistema

- **Frontend**: `http://localhost:3000` (React/CRACO)
- **Backend**: `http://localhost:3001` (Express/Node.js)

## Verificar que los Servicios Estén Corriendo

### Backend (Puerto 3001)
```bash
curl http://localhost:3001/api/health
```

**Respuesta esperada**:
```json
{"status":"ok","message":"API funcionando correctamente"}
```

### Frontend (Puerto 3000)
Abrir en el navegador: `http://localhost:3000`

**Respuesta esperada**: Página de login del sistema contable

## Solución de Problemas

### Error: Puerto 3000 ya está en uso

Si el puerto 3000 está ocupado:

1. **Encontrar el proceso que usa el puerto**:
   ```bash
   netstat -ano | findstr ":3000"
   ```

2. **Terminar el proceso** (reemplazar PID con el número del proceso):
   ```bash
   taskkill /PID <PID> /F
   ```

3. **Reiniciar el frontend**:
   ```bash
   cd frontend
   npm start
   ```

### Error: Módulos no encontrados

Si hay errores de módulos faltantes:

```bash
cd frontend
rm -rf node_modules
npm install
npm start
```

### Error: Compilación falla

Si hay errores de compilación:

1. Verificar errores en la consola
2. Limpiar caché:
   ```bash
   cd frontend
   npm run build
   npm start
   ```

## Comandos Útiles

### Ver procesos Node.js corriendo
```powershell
Get-Process | Where-Object {$_.ProcessName -like "*node*"}
```

### Verificar puertos en uso
```bash
netstat -ano | findstr ":3000"
netstat -ano | findstr ":3001"
```

### Detener todos los procesos Node.js
```powershell
Get-Process | Where-Object {$_.ProcessName -like "*node*"} | Stop-Process -Force
```

## Estado Actual

- ✅ Backend: Corriendo en puerto 3001
- ⚠️ Frontend: Debe iniciarse en puerto 3000

## Iniciar Ambos Servicios

### Terminal 1 - Backend
```bash
cd backend
npm start
```

### Terminal 2 - Frontend
```bash
cd frontend
npm start
```

---

**Nota**: El frontend puede tardar unos segundos en compilar y estar listo. Espera a ver el mensaje "Compiled successfully!" antes de intentar acceder.

