# 🔧 Solución para Backend que se Detiene Frecuentemente

## ⚠️ PROBLEMA CRÍTICO

El archivo `backend/src/server.ts` fue sobrescrito accidentalmente y ahora solo tiene 32 líneas. **El backend necesita ser restaurado desde un respaldo**.

## 📋 Problemas Identificados que Causan Caídas

### 1. Errores no Capturados
- **Problema**: Errores no manejados pueden cerrar el proceso de Node.js
- **Solución**: Agregar manejo de `uncaughtException` y `unhandledRejection`

### 2. Problemas de Conexión a Base de Datos
- **Problema**: Si la conexión a SQL Server se pierde, el pool puede quedar en estado inválido
- **Solución**: Mejorar el manejo de reconexión y errores del pool

### 3. Memoria Insuficiente
- **Problema**: Node.js puede quedarse sin memoria si hay fugas
- **Solución**: Configurar límites de pool y timeouts

## ✅ Soluciones Implementadas

### 1. Script de Monitoreo Automático

Se creó un script PowerShell (`backend/monitor-backend.ps1`) que:

- ✅ Verifica el estado del backend cada 30 segundos
- ✅ Reinicia automáticamente si detecta 3 fallos consecutivos
- ✅ Muestra el estado en tiempo real
- ✅ Registra los intentos de recuperación

### Uso del Monitor

```powershell
# Desde el directorio backend
cd backend
.\monitor-backend.ps1
```

O desde la raíz del proyecto:

```powershell
cd backend
.\monitor-backend.ps1
```

## 🛠️ Cambios Necesarios en server.ts (cuando se restaure)

### 1. Manejo de Errores No Capturados

Agregar al inicio del archivo (después de las importaciones):

```typescript
// Manejo de errores no capturados
process.on('uncaughtException', (error: Error) => {
  console.error('❌ Error no capturado:', error);
  console.error('Stack:', error.stack);
  // No cerrar el proceso, solo registrar el error
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('❌ Promesa rechazada no manejada:', reason);
  // No cerrar el proceso, solo registrar el error
});
```

### 2. Manejo de Señales de Terminación

Agregar antes de `app.listen`:

```typescript
// Manejo de señales de terminación
process.on('SIGTERM', () => {
  console.log('⚠️  Señal SIGTERM recibida, cerrando servidor...');
  if (pool) {
    pool.close().catch(console.error);
  }
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('⚠️  Señal SIGINT recibida, cerrando servidor...');
  if (pool) {
    pool.close().catch(console.error);
  }
  process.exit(0);
});
```

### 3. Mejora en getConnection()

Modificar la función `getConnection()` para manejar reconexión:

```typescript
async function getConnection(): Promise<sql.ConnectionPool> {
  if (!pool || !dbConnected) {
    // Cerrar pool anterior si existe
    if (pool) {
      try {
        await pool.close();
      } catch (e) {
        console.warn('⚠️  Error al cerrar pool anterior:', e);
      }
    }

    pool = await sql.connect(dbConfig);
    dbConnected = true;

    // Manejar errores de conexión
    pool.on('error', (err: Error) => {
      console.error('❌ Error en el pool de conexiones:', err);
      dbConnected = false;
      pool = null;
    });
  }
  return pool;
}
```

### 4. Manejo de Errores en app.listen

Modificar `app.listen`:

```typescript
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📊 Monitoreo de errores activado`);
}).on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Error: El puerto ${PORT} ya está en uso`);
  } else {
    console.error('❌ Error al iniciar el servidor:', error);
  }
  process.exit(1);
});
```

## 🚀 Solución Temporal: Usar el Monitor

Mientras se restaura el archivo, usa el script de monitoreo:

```powershell
cd backend
.\monitor-backend.ps1
```

Este script:
- ✅ Mantendrá el backend funcionando
- ✅ Lo reiniciará automáticamente si se cae
- ✅ Te notificará cuando haya problemas

## 📝 Checklist de Restauración

- [ ] Restaurar `backend/src/server.ts` desde respaldo
- [ ] Aplicar los cambios de manejo de errores
- [ ] Compilar: `npm run build`
- [ ] Probar: `npm start`
- [ ] Configurar el monitor para producción

## 🔍 Diagnóstico de Problemas

Si el backend sigue cayéndose:

1. **Revisar logs del backend** para identificar errores específicos
2. **Verificar conexión a base de datos** con `sqlcmd`
3. **Monitorear uso de memoria** con `Get-Process node`
4. **Verificar puertos** con `netstat -ano | findstr ":3001"`
5. **Usar el script de monitoreo** para detectar patrones

---

**Estado**: ⚠️ **Archivo server.ts necesita restauración**
**Solución temporal**: ✅ Script de monitoreo disponible
