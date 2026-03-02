# ✅ Tabla Clientes Creada Exitosamente

## 📋 Resumen

Se ha creado la tabla **Clientes** con campos específicos para la gestión de clientes en el sistema contable.

---

## 🗄️ Estructura de la Tabla

### Tabla: Clientes

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `IdCliente` | INT | ID único del cliente (PK, Identity) |
| `IdTercero` | INT | Relación con tabla Terceros (FK, UNIQUE) |
| `CodigoCliente` | NVARCHAR(50) | Código interno del cliente (UNIQUE) |
| `Telefono` | NVARCHAR(20) | Teléfono fijo |
| `Celular` | NVARCHAR(20) | Número de celular |
| `Email` | NVARCHAR(100) | Correo electrónico |
| `Ciudad` | NVARCHAR(100) | Ciudad del cliente |
| `Departamento` | NVARCHAR(100) | Departamento del cliente |
| `TipoPersona` | NVARCHAR(1) | N=Natural, J=Jurídica (default: 'J') |
| `RegimenTributario` | NVARCHAR(50) | Régimen tributario (Simplificado, Común, etc.) |
| `CondicionPago` | NVARCHAR(20) | Condición de pago (default: 'Contado') |
| `LimiteCredito` | DECIMAL(18,2) | Límite de crédito (default: 0) |
| `SaldoActual` | DECIMAL(18,2) | Saldo actual del cliente (default: 0) |
| `Descuento` | DECIMAL(5,2) | Porcentaje de descuento por defecto (default: 0) |
| `Observaciones` | NVARCHAR(1000) | Observaciones adicionales |
| `Activo` | BIT | Estado activo/inactivo (default: 1) |
| `FechaCreacion` | DATETIME | Fecha de creación (default: GETDATE()) |
| `FechaModificacion` | DATETIME | Fecha de última modificación (default: GETDATE()) |

---

## 🔗 Relaciones

### Foreign Keys
- `IdTercero` → `Terceros(IdTercero)` ON DELETE CASCADE
  - Cada cliente debe estar relacionado con un registro en Terceros
  - Si se elimina el Tercero, se elimina el Cliente

### Unique Constraints
- `IdTercero` - Un tercero solo puede ser un cliente
- `CodigoCliente` - El código de cliente debe ser único

---

## 📊 Índices Creados

1. **IX_Clientes_CodigoCliente**
   - Campo: `CodigoCliente`
   - Tipo: NONCLUSTERED
   - Filtro: WHERE CodigoCliente IS NOT NULL

2. **IX_Clientes_Email**
   - Campo: `Email`
   - Tipo: NONCLUSTERED
   - Filtro: WHERE Email IS NOT NULL

3. **IX_Clientes_Activo**
   - Campo: `Activo`
   - Tipo: NONCLUSTERED

---

## 👁️ Vista: VistaClientes

Se creó una vista que combina información de `Clientes` y `Terceros`:

```sql
SELECT * FROM VistaClientes
```

**Campos incluidos:**
- Todos los campos de Clientes
- NIT (desde Terceros)
- NombreRazonSocial (desde Terceros)
- Direccion (desde Terceros)

**Filtros:**
- Solo muestra clientes activos (Activo = 1)
- Solo muestra terceros activos

---

## 🔄 Migración de Datos

El script migra automáticamente los terceros tipo 'C' (Cliente) existentes a la tabla Clientes:

- Genera código de cliente automático: `CLI-0001`, `CLI-0002`, etc.
- Mantiene el estado activo
- No duplica registros ya migrados

---

## 📝 Ejemplos de Uso

### Crear un Cliente Nuevo

```sql
-- 1. Primero crear el Tercero
INSERT INTO Terceros (NIT, NombreRazonSocial, Direccion, Tipo, Activo)
VALUES ('900123456-7', 'Cliente Nuevo S.A.S', 'Calle 123', 'C', 1);

-- 2. Luego crear el Cliente
INSERT INTO Clientes (
  IdTercero,
  CodigoCliente,
  Telefono,
  Email,
  Ciudad,
  TipoPersona,
  RegimenTributario,
  CondicionPago,
  LimiteCredito
)
VALUES (
  SCOPE_IDENTITY(), -- ID del Tercero recién creado
  'CLI-0001',
  '6012345678',
  'cliente@ejemplo.com',
  'Bogotá',
  'J',
  'Régimen Común',
  '30 días',
  5000000
);
```

### Consultar Clientes

```sql
-- Usar la vista para obtener información completa
SELECT * FROM VistaClientes;

-- Filtrar por ciudad
SELECT * FROM VistaClientes WHERE Ciudad = 'Bogotá';

-- Buscar por código
SELECT * FROM VistaClientes WHERE CodigoCliente = 'CLI-0001';

-- Buscar por email
SELECT * FROM VistaClientes WHERE Email LIKE '%@ejemplo.com';
```

### Actualizar Cliente

```sql
UPDATE Clientes
SET
  Telefono = '6012345679',
  Email = 'nuevo@ejemplo.com',
  LimiteCredito = 10000000,
  FechaModificacion = GETDATE()
WHERE IdCliente = 1;
```

---

## 🔧 Próximos Pasos Recomendados

### 1. Crear Endpoints API

Crear endpoints en el backend para:
- `GET /api/clientes` - Listar clientes
- `GET /api/clientes/:id` - Obtener un cliente
- `POST /api/clientes` - Crear cliente
- `PUT /api/clientes/:id` - Actualizar cliente
- `DELETE /api/clientes/:id` - Eliminar cliente (soft delete)

### 2. Actualizar Frontend

- Crear componente de gestión de clientes
- Integrar con formularios de facturación
- Agregar búsqueda y filtros

### 3. Funcionalidades Adicionales

- Historial de compras del cliente
- Reporte de saldos por cliente
- Alertas de límite de crédito
- Categorización de clientes

---

## ⚠️ Notas Importantes

1. **Relación con Terceros**: Cada cliente DEBE tener un registro en Terceros con Tipo = 'C'

2. **Código de Cliente**: Se puede generar automáticamente o asignar manualmente

3. **Saldo Actual**: Este campo debe actualizarse cuando se crean facturas o se registran pagos

4. **Límite de Crédito**: Validar antes de permitir ventas a crédito

5. **Soft Delete**: Usar el campo `Activo` para desactivar clientes en lugar de eliminarlos

---

## 📊 Estado Actual

| Componente | Estado |
|------------|--------|
| Tabla Clientes | ✅ Creada |
| Índices | ✅ Creados |
| Vista VistaClientes | ✅ Creada |
| Migración de datos | ✅ Completada |
| Foreign Keys | ✅ Configuradas |

---

**Fecha de creación:** $(date)
**Versión:** 1.0.0

