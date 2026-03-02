# 🔍 Debug: Error al Crear Vendedor

## Problema

El usuario reporta que sigue apareciendo el error "Error al crear el vendedor" al intentar guardar un vendedor.

## Cambios Realizados

### 1. Mejora en el Manejo de Errores del Backend

Se ha mejorado el endpoint POST /api/vendedores para mostrar más detalles del error:

```typescript
} catch (error) {
  await transaction.rollback();
  console.error('Error al crear vendedor:', error);
  console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
  console.error('Request body:', JSON.stringify(req.body, null, 2));
  res.status(500).json({
    success: false,
    error: 'Error al crear el vendedor',
    mensaje: error instanceof Error ? error.message : 'Error desconocido',
    detalles: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : String(error)) : undefined
  });
}
```

### 2. Mejora en el Manejo de Errores del Frontend

Se ha mejorado el componente VendedorForm para mostrar más detalles del error:

```typescript
} catch (err: any) {
  console.error('Error completo al guardar vendedor:', err);
  const mensajeError = err.response?.data?.mensaje || err.response?.data?.error || err.message || 'Error desconocido';
  const detallesError = err.response?.data?.detalles || '';
  setError(`Error al guardar vendedor: ${mensajeError}${detallesError ? `\nDetalles: ${detallesError}` : ''}`);
}
```

## Pasos para Diagnosticar

### 1. Verificar que el Backend Esté Corriendo

```bash
curl http://localhost:3001/api/health
```

**Respuesta esperada**: `{"status":"ok","message":"API funcionando correctamente"}`

### 2. Verificar la Estructura de la Tabla

```sql
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'Vendedores'
ORDER BY ORDINAL_POSITION;
```

**Campos esperados**:
- IdVendedor
- CodigoVendedor
- IdTercero
- Telefono
- Email
- Comision
- Activo
- FechaCreacion
- FechaModificacion

### 3. Revisar los Logs del Backend

Cuando intentes crear un vendedor, revisa la consola del backend. Deberías ver:
- El error completo
- El stack trace
- Los datos que se están recibiendo (req.body)

### 4. Revisar la Consola del Navegador

Abre las herramientas de desarrollador (F12) y revisa:
- La pestaña Console para ver los logs
- La pestaña Network para ver la petición HTTP y la respuesta del servidor

### 5. Probar el Endpoint Directamente

```bash
curl -X POST http://localhost:3001/api/vendedores \
  -H "Content-Type: application/json" \
  -d "{\"nit\":\"123456789-0\",\"nombreRazonSocial\":\"Test Vendedor\",\"comision\":5.5}"
```

## Posibles Causas

### 1. Campo Telefono No Existe

**Solución**: Ejecutar el script para agregar el campo:
```bash
cd backend
node ejecutar-agregar-telefono-vendedores.js
```

### 2. Error en la Transacción

**Solución**: Verificar que todas las consultas usen la misma transacción.

### 3. Error en los Datos Enviados

**Solución**: Verificar que el frontend esté enviando los datos correctamente.

### 4. Backend No Recompilado

**Solución**: Recompilar el backend:
```bash
cd backend
npm run build
npm start
```

## Próximos Pasos

1. ✅ Backend recompilado con mejor manejo de errores
2. ✅ Frontend actualizado con mejor manejo de errores
3. ⏳ Probar crear un vendedor y revisar los logs
4. ⏳ Identificar el error específico
5. ⏳ Aplicar la solución correspondiente

## Información a Revisar

Cuando intentes crear un vendedor, por favor comparte:

1. **Mensaje de error completo** que aparece en el frontend
2. **Logs de la consola del backend** (terminal donde corre npm start)
3. **Logs de la consola del navegador** (F12 > Console)
4. **Datos que estás ingresando** en el formulario

Con esta información podremos identificar exactamente qué está fallando.

---

**Fecha**: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
**Estado**: 🔍 En diagnóstico

