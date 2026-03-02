# ✅ Integración Contable Implementada

## 📋 Resumen de Cambios

Se ha implementado la integración contable automática y validaciones mejoradas para facturas y compras.

---

## 🎯 Funcionalidades Implementadas

### 1. ✅ Asientos Contables Automáticos

#### Facturas
- **Cuándo se genera**: Cuando una factura se crea con estado `"Emitida"`
- **Cuentas utilizadas**:
  - **Débito**: `130505` - Cuentas por Cobrar - Clientes
  - **Crédito**: `413500` - Ingresos Operacionales - Ventas
  - **Crédito**: `240805` - IVA por Pagar

#### Compras
- **Cuándo se genera**: Cuando una compra se crea con estado `"Recibida"`
- **Cuentas utilizadas**:
  - **Débito**: `143505` - Inventario
  - **Débito**: `240805` - IVA Descontable
  - **Crédito**: `220505` - Cuentas por Pagar - Proveedores

### 2. ✅ Validaciones Implementadas

#### Facturas
- ✅ Validación de existencia y estado del cliente
- ✅ Validación de existencia y estado de productos
- ✅ Validación de stock disponible (con opción de continuar sin stock)
- ✅ Retorna advertencias si se factura sin stock

#### Compras
- ✅ Validación de existencia y estado del proveedor
- ✅ Validación de existencia y estado de productos

---

## 📝 Uso de la API

### Crear Factura con Validación de Stock

#### Request Normal (valida stock)
```json
POST /api/facturas
{
  "numeroFactura": "FAC-001",
  "fecha": "2024-01-15",
  "idCliente": 1,
  "estado": "Emitida",
  "detalles": [
    {
      "idProducto": 1,
      "cantidad": 10,
      "precioUnitario": 1000,
      "descuento": 0,
      "iva": 19
    }
  ],
  "idUsuarioCreacion": 1
}
```

#### Si hay stock insuficiente (sin flag continuarSinStock)
```json
Response 400:
{
  "success": false,
  "error": "STOCK_INSUFICIENTE",
  "mensaje": "Algunos productos no tienen stock suficiente",
  "detalles": {
    "productosSinStock": [
      {
        "idProducto": 1,
        "nombre": "Producto A",
        "stockDisponible": 5,
        "cantidadSolicitada": 10
      }
    ],
    "continuarSinStock": false
  }
}
```

#### Request con continuarSinStock = true
```json
POST /api/facturas
{
  "numeroFactura": "FAC-001",
  "fecha": "2024-01-15",
  "idCliente": 1,
  "estado": "Emitida",
  "continuarSinStock": true,
  "detalles": [
    {
      "idProducto": 1,
      "cantidad": 10,
      "precioUnitario": 1000,
      "descuento": 0,
      "iva": 19
    }
  ],
  "idUsuarioCreacion": 1
}
```

#### Response exitoso con advertencia
```json
Response 201:
{
  "success": true,
  "idFactura": 123,
  "idComprobante": 456,
  "mensaje": "Factura creada exitosamente",
  "advertencias": {
    "productosSinStock": [
      {
        "idProducto": 1,
        "nombre": "Producto A",
        "stockDisponible": 5,
        "cantidadSolicitada": 10
      }
    ],
    "mensaje": "Algunos productos se facturaron sin stock disponible"
  }
}
```

### Crear Compra

```json
POST /api/compras
{
  "numeroFactura": "COMP-001",
  "fecha": "2024-01-15",
  "idProveedor": 2,
  "estado": "Recibida",
  "detalles": [
    {
      "idProducto": 1,
      "cantidad": 20,
      "precioUnitario": 800,
      "descuento": 0,
      "iva": 19
    }
  ],
  "idUsuarioCreacion": 1
}
```

#### Response exitoso
```json
Response 201:
{
  "success": true,
  "idCompra": 78,
  "idComprobante": 457,
  "mensaje": "Compra creada exitosamente"
}
```

---

## 🔧 Archivos Modificados

### Nuevos Archivos
- `backend/src/services/contabilidad.ts` - Servicio para crear asientos automáticos

### Archivos Modificados
- `backend/src/server.ts` - Endpoints de facturas y compras actualizados

---

## ⚙️ Configuración de Cuentas Contables

**IMPORTANTE**: Asegúrate de que las siguientes cuentas existan en tu PUC:

### Para Facturas
- `130505` - Cuentas por Cobrar - Clientes
- `413500` - Ingresos Operacionales - Ventas
- `240805` - IVA por Pagar

### Para Compras
- `143505` - Inventario
- `240805` - IVA Descontable
- `220505` - Cuentas por Pagar - Proveedores

Si tus cuentas tienen códigos diferentes, modifica los códigos en:
- `backend/src/server.ts` (líneas donde se crean los movimientos del asiento)

---

## 🎨 Flujo de Trabajo Recomendado en Frontend

### Para Facturación

1. **Validar stock antes de mostrar formulario**:
   ```typescript
   // Verificar stock al agregar productos
   const verificarStock = async (idProducto: number, cantidad: number) => {
     const producto = await api.productos.obtenerProducto(idProducto);
     if (producto.cantidadStock < cantidad) {
       // Mostrar advertencia al usuario
       setAdvertenciaStock({
         producto: producto.nombre,
         stockDisponible: producto.cantidadStock,
         cantidadSolicitada: cantidad
       });
     }
   };
   ```

2. **Manejar respuesta de stock insuficiente**:
   ```typescript
   try {
     const respuesta = await api.facturas.crearFactura(factura);
     // Factura creada exitosamente
   } catch (error) {
     if (error.status === 400 && error.details?.error === 'STOCK_INSUFICIENTE') {
       // Mostrar modal de confirmación
       const continuar = await mostrarConfirmacion(
         'Stock insuficiente',
         '¿Desea continuar con la facturación sin stock?',
         error.details.productosSinStock
       );

       if (continuar) {
         // Reintentar con continuarSinStock = true
         const respuesta = await api.facturas.crearFactura({
           ...factura,
           continuarSinStock: true
         });
       }
     }
   }
   ```

3. **Mostrar advertencias después de crear factura**:
   ```typescript
   if (respuesta.advertencias?.productosSinStock) {
     mostrarNotificacion(
       'Advertencia',
       'Algunos productos se facturaron sin stock disponible',
       'warning'
     );
   }
   ```

---

## 🧪 Casos de Prueba

### Test 1: Factura con stock suficiente
1. Crear factura con productos que tienen stock
2. Estado: "Emitida"
3. **Esperado**: Factura creada + Asiento contable generado

### Test 2: Factura sin stock (sin flag)
1. Crear factura con productos sin stock suficiente
2. Estado: "Emitida"
3. **Esperado**: Error 400 con mensaje STOCK_INSUFICIENTE

### Test 3: Factura sin stock (con flag)
1. Crear factura con `continuarSinStock: true`
2. Estado: "Emitida"
3. **Esperado**: Factura creada + Asiento contable + Advertencia en respuesta

### Test 4: Compra recibida
1. Crear compra con estado "Recibida"
2. **Esperado**: Compra creada + Asiento contable generado

### Test 5: Factura en borrador
1. Crear factura con estado "Borrador"
2. **Esperado**: Factura creada, NO se genera asiento contable

---

## ⚠️ Notas Importantes

1. **Asientos automáticos**: Solo se generan cuando el estado es "Emitida" (facturas) o "Recibida" (compras)

2. **Manejo de errores**: Si falla la generación del asiento contable, la factura/compra se crea igualmente, pero se registra un error en los logs del servidor

3. **Validación de cuentas**: El sistema valida que todas las cuentas contables existan y estén activas antes de crear el asiento

4. **Partida doble**: Se valida automáticamente que débito = crédito antes de crear el asiento

5. **Stock negativo**: Con `continuarSinStock: true`, el inventario puede quedar en negativo. Los triggers de inventario seguirán funcionando normalmente.

---

## 🔄 Próximos Pasos Recomendados

1. **Reversión de asientos**: Implementar reversión automática cuando se anula una factura/compra
2. **Validación de cuentas configurables**: Permitir configurar qué cuentas usar desde la base de datos
3. **Notificaciones**: Integrar sistema de notificaciones para alertar sobre stock bajo
4. **Reportes**: Generar reportes de asientos contables automáticos

---

**Fecha de implementación**: $(date)
**Versión**: 1.1.0

