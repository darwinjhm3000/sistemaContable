# Reiniciar Backend para Aplicar Cambios

## ⚠️ Problema
El error 404 puede ocurrir cuando el backend no se ha reiniciado después de agregar nuevos endpoints.

## 🔧 Solución

### Opción 1: Reiniciar usando el script
```bash
# Detener el backend actual (Ctrl+C en la terminal donde corre)
# Luego ejecutar:
.\iniciar-backend.bat
```

### Opción 2: Reiniciar manualmente
```bash
cd backend
npm run build
npm start
```

### Opción 3: Si usa ts-node-dev (modo desarrollo)
```bash
cd backend
npm run dev
```

## ✅ Verificar que funciona

Después de reiniciar, verificar que el endpoint responde:
- Abrir navegador: http://localhost:3001/api/health
- Debe retornar: `{"status":"ok"}`

## 📝 Endpoints agregados recientemente

1. `POST /api/compras/scan-pdf` - Escanear factura PDF
2. `POST /api/proveedores` - Crear proveedor (ya existía, pero verificar que funciona)

## 🔍 Si el error persiste

1. Verificar que el backend está corriendo en el puerto 3001
2. Verificar los logs del backend para ver errores
3. Verificar que la base de datos está accesible
4. Verificar que todos los endpoints están correctamente registrados en `server.ts`
