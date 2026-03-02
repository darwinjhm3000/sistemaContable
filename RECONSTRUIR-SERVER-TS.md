# ⚠️ IMPORTANTE: Archivo server.ts Necesita Reconstrucción Completa

## Problema

El archivo `backend/src/server.ts` fue sobrescrito accidentalmente y ahora solo tiene 32 líneas en lugar de más de 3000.

## Estado Actual

- ✅ Base del archivo creada (importaciones, configuración, manejo de errores)
- ✅ Endpoints básicos creados (login, health)
- ❌ Faltan TODOS los demás endpoints

## Endpoints que Faltan

### 1. PUC (Plan Único de Cuentas)
- GET /api/puc
- GET /api/puc/:codigo

### 2. Terceros
- GET /api/terceros

### 3. Clientes
- GET /api/clientes
- GET /api/clientes/:id
- POST /api/clientes
- PUT /api/clientes/:id
- DELETE /api/clientes/:id

### 4. Vendedores
- GET /api/vendedores
- GET /api/vendedores/:id
- POST /api/vendedores
- PUT /api/vendedores/:id
- DELETE /api/vendedores/:id

### 5. Proveedores
- GET /api/proveedores
- GET /api/proveedores/:id
- POST /api/proveedores
- PUT /api/proveedores/:id
- DELETE /api/proveedores/:id

### 6. Productos
- GET /api/productos
- GET /api/productos/:id
- GET /api/productos/buscar/:codigo
- POST /api/productos
- PUT /api/productos/:id

### 7. Facturas
- POST /api/facturas (con generación automática de número, validación de stock, asientos automáticos)
- GET /api/facturas
- GET /api/facturas/:id
- PUT /api/facturas/:id/estado

### 8. Compras
- POST /api/compras (con asientos automáticos)
- GET /api/compras
- GET /api/compras/:id
- PUT /api/compras/:id/estado

### 9. Inventario
- GET /api/inventario
- GET /api/inventario/:idProducto/movimientos

### 10. Asientos Contables
- POST /api/asientos
- GET /api/asientos

## Solución Recomendada

**Opción 1: Restaurar desde respaldo**
- Si tienes un respaldo del archivo, restáuralo

**Opción 2: Reconstruir manualmente**
- Usar la documentación existente para reconstruir cada endpoint
- Referencias útiles:
  - `ENDPOINTS-VENDEDORES-CORREGIDOS.md`
  - `ENDPOINTS-CLIENTES-IMPLEMENTADOS.md`
  - `DASHBOARD-VENDEDORES-PROVEEDORES.md`
  - `INTEGRACION-CONTABLE-IMPLEMENTADA.md`
  - `NUMERO-FACTURA-AUTOMATICO.md`
  - `BUSQUEDA-POR-NOMBRE.md`
  - `CODIGO-BARRAS-IMPLEMENTADO.md`

**Opción 3: Usar el script de monitoreo**
- Mientras tanto, usar `backend/monitor-backend.ps1` para mantener el backend funcionando

## Próximos Pasos

1. **Inmediato**: El backend actual NO puede funcionar sin todos los endpoints
2. **Corto plazo**: Reconstruir los endpoints críticos primero:
   - Facturas (con generación automática de número)
   - Compras
   - Productos (con búsqueda)
   - Clientes
   - Vendedores
   - Proveedores
3. **Mediano plazo**: Agregar los endpoints restantes

---

**Estado**: ⚠️ **CRÍTICO - Backend no funcional sin todos los endpoints**
**Prioridad**: 🔴 **ALTA - Reconstruir inmediatamente**

