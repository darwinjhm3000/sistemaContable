# Solución: Error de Conexión con el Servidor

## 🔴 Problema
El error "Error de conexión con el servidor" indica que **el backend no está corriendo**.

## ✅ Solución

### Paso 1: Verificar que el backend esté compilado
```bash
cd backend
npm run build
```

### Paso 2: Iniciar el backend

**Opción A: Usar el script (Recomendado)**
```bash
.\iniciar-backend.bat
```

**Opción B: Iniciar manualmente**
```bash
cd backend
npm start
```

### Paso 3: Verificar que funciona

Después de iniciar, deberías ver:
```
🚀 Servidor corriendo en http://localhost:3001
📊 Monitoreo de errores activado
```

### Paso 4: Probar la conexión

Abre en el navegador: http://localhost:3001/api/health

Deberías ver:
```json
{"status":"ok","message":"Servidor funcionando correctamente"}
```

## 🔍 Verificación

1. **Puerto 3001 disponible:**
   ```bash
   netstat -ano | findstr :3001
   ```
   Debe mostrar `LISTENING`

2. **Backend respondiendo:**
   - Abre: http://localhost:3001/api/health
   - Debe retornar JSON con status ok

3. **Frontend conectado:**
   - El frontend debe estar en: http://localhost:3000
   - Verifica que `API_URL` en `frontend/src/services/api.ts` sea `http://localhost:3001`

## ⚠️ Si el error persiste

1. **Verificar que no hay otro proceso usando el puerto 3001:**
   ```bash
   netstat -ano | findstr :3001
   ```

2. **Verificar logs del backend:**
   - Revisa la terminal donde corre el backend
   - Busca errores de conexión a la base de datos

3. **Verificar firewall:**
   - Asegúrate de que el firewall no esté bloqueando el puerto 3001

4. **Reiniciar ambos servicios:**
   - Detén backend (Ctrl+C)
   - Detén frontend (Ctrl+C)
   - Inicia backend primero
   - Luego inicia frontend

## 📝 Nota Importante

El backend debe estar corriendo **antes** de usar el frontend. Si el backend no está activo, todas las llamadas a la API fallarán con "Error de conexión con el servidor".

