# ✅ Generación Automática de Número de Factura

## 🎯 Funcionalidad Implementada

El sistema ahora genera automáticamente el número de factura cuando se crea una nueva factura.

## 📋 Formato del Número de Factura

El formato utilizado es: **FAC-YYYY-NNNN**

- **FAC**: Prefijo fijo para Factura
- **YYYY**: Año de la factura (ej: 2024)
- **NNNN**: Número secuencial de 4 dígitos (ej: 0001, 0002, 0003...)

### Ejemplos:
- `FAC-2024-0001` (Primera factura del 2024)
- `FAC-2024-0002` (Segunda factura del 2024)
- `FAC-2025-0001` (Primera factura del 2025)

## 🔧 Implementación

### Backend (`backend/src/server.ts`)

1. **Función `generarNumeroFactura()`**:
   - Busca el último número de factura del año actual
   - Incrementa el número secuencial
   - Genera el nuevo número en formato `FAC-YYYY-NNNN`

2. **Endpoint `POST /api/facturas`**:
   - Si `numeroFactura` no se proporciona o está vacío, se genera automáticamente
   - Si se proporciona manualmente, se usa el número especificado

### Frontend (`frontend/src/pages/FacturacionPage.tsx`)

1. **Campo de Número de Factura**:
   - Ahora es de solo lectura
   - Muestra "Se generará automáticamente"
   - El usuario no necesita ingresarlo manualmente

2. **Envío de Datos**:
   - Si el campo está vacío o muestra el texto por defecto, no se envía `numeroFactura`
   - El backend genera el número automáticamente

## 🎨 Comportamiento

### Al Crear una Nueva Factura:

1. El usuario llena el formulario (sin número de factura)
2. Al guardar, el backend:
   - Detecta que no hay número de factura
   - Busca el último número del año actual
   - Genera el siguiente número secuencial
   - Guarda la factura con el número generado

### Si el Usuario Quiere un Número Específico:

1. El usuario puede modificar el campo (aunque está en modo readonly por defecto)
2. Si ingresa un número manualmente, ese número se usará
3. El backend validará que el número no esté duplicado

## ✅ Ventajas

- ✅ **Sin errores de duplicados**: El sistema garantiza números únicos
- ✅ **Secuencial por año**: Cada año comienza desde 0001
- ✅ **Formato consistente**: Todas las facturas siguen el mismo formato
- ✅ **Menos trabajo manual**: El usuario no necesita pensar en el número
- ✅ **Trazabilidad**: Fácil identificar el año de la factura

## 🔄 Reinicio de Numeración

La numeración se reinicia cada año:
- **2024**: FAC-2024-0001, FAC-2024-0002, ...
- **2025**: FAC-2025-0001, FAC-2025-0002, ...

## 📝 Notas Técnicas

- El número se genera dentro de una transacción para evitar duplicados
- Si hay un error al generar, la transacción se revierte
- El formato permite hasta 9999 facturas por año
- Si se alcanza el límite, se puede ajustar el formato

## 🧪 Pruebas

Para probar la funcionalidad:

1. Crear una nueva factura sin especificar número
2. Verificar que se asigne un número automáticamente
3. Crear otra factura y verificar que el número se incrementa
4. Cambiar el año y verificar que la numeración se reinicia

---

**Fecha de implementación**: $(Get-Date -Format "yyyy-MM-dd")
**Versión**: 1.0.0

