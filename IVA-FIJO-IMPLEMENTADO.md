# ✅ IVA Fijo Implementado

## 🎯 Funcionalidad Implementada

El porcentaje de IVA ahora es **fijo y no modificable** cuando se carga un artículo en la factura. El porcentaje se toma directamente del producto y no puede ser alterado.

## 📋 Cambios Realizados

### Frontend (`frontend/src/pages/FacturacionPage.tsx`)

1. **Campo `porcentajeIVA` agregado**:
   - Se guarda el porcentaje de IVA del producto en un campo separado
   - Este campo es fijo y no se modifica

2. **Campo de IVA en la tabla**:
   - Ahora es de **solo lectura** (readOnly)
   - Muestra el porcentaje del producto
   - Tiene estilo gris para indicar que no es editable
   - Tooltip: "El porcentaje de IVA es fijo según el producto"

3. **Cálculo del IVA**:
   - Cuando se selecciona un producto, se establece `porcentajeIVA` desde el producto
   - El valor del IVA se calcula usando este porcentaje fijo
   - El porcentaje no puede ser modificado por el usuario

### Comportamiento

1. **Al seleccionar un producto**:
   - Se carga el precio de venta del producto
   - Se establece el porcentaje de IVA del producto (fijo)
   - Se calcula automáticamente el valor del IVA

2. **Al modificar cantidad, precio o descuento**:
   - Se recalcula el neto
   - Se recalcula el IVA usando el porcentaje fijo del producto
   - El porcentaje de IVA permanece inalterado

3. **Al guardar la factura**:
   - Se envía el porcentaje de IVA del producto (no el valor calculado)
   - El backend calcula el valor del IVA usando este porcentaje

## ✅ Ventajas

- ✅ **Consistencia**: El IVA siempre coincide con el del producto
- ✅ **Precisión**: No hay errores por modificación manual del IVA
- ✅ **Cumplimiento**: Se respeta la configuración del producto
- ✅ **Simplicidad**: El usuario no necesita preocuparse por el IVA

## 🔍 Ejemplo

**Producto**: Lápiz
- **IVA del producto**: 19%
- **Precio**: $1,000
- **Cantidad**: 10

**Resultado en la factura**:
- **Subtotal**: $10,000
- **IVA %**: 19% (fijo, no modificable)
- **Valor IVA**: $1,900
- **Total**: $11,900

## 📝 Notas Técnicas

- El campo `porcentajeIVA` se mantiene en el estado del componente
- El campo `iva` contiene el valor calculado del IVA
- Al enviar al backend, se envía el porcentaje (no el valor)
- El backend recalcula el valor del IVA usando el porcentaje

---

**Fecha de implementación**: $(Get-Date -Format "yyyy-MM-dd")
**Versión**: 1.0.0

