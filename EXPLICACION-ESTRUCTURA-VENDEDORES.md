# 📋 Explicación: Estructura de Vendedores y Dirección

## 🔍 Problema Identificado

Al consultar directamente la tabla `Vendedores` en SQL Server Management Studio, no se ve el campo `Direccion` porque **este campo está en la tabla `Terceros`, no en `Vendedores`**.

## 📊 Estructura de las Tablas

### Tabla: Vendedores

```sql
SELECT * FROM Vendedores
```

**Campos en la tabla Vendedores**:
- `IdVendedor` (PK)
- `CodigoVendedor`
- `IdTercero` (FK → Terceros)
- `Telefono`
- `Email`
- `Comision`
- `Activo`
- `FechaCreacion`
- `FechaModificacion`

**❌ NO tiene**: `Direccion`, `NIT`, `NombreRazonSocial`

### Tabla: Terceros

```sql
SELECT * FROM Terceros
```

**Campos en la tabla Terceros**:
- `IdTercero` (PK)
- `NIT`
- `NombreRazonSocial`
- `Direccion` ✅ **AQUÍ ESTÁ LA DIRECCIÓN**
- `Tipo` ('C'=Cliente, 'P'=Proveedor, 'V'=Vendedor)
- `Activo`

## 🔗 Relación entre Tablas

```
Vendedores (1) ──→ (1) Terceros
     │                    │
     │                    ├── NIT
     │                    ├── NombreRazonSocial
     │                    └── Direccion ✅
     │
     ├── CodigoVendedor
     ├── Telefono
     ├── Email
     └── Comision
```

## ✅ Consulta Correcta para Ver Todos los Datos

Para ver todos los datos de un vendedor (incluyendo dirección), debes hacer un **JOIN**:

```sql
SELECT
    v.IdVendedor,
    v.CodigoVendedor,
    v.IdTercero,
    t.NIT,
    t.NombreRazonSocial,
    t.Direccion,  -- ✅ Dirección desde Terceros
    v.Telefono,
    v.Email,
    v.Comision,
    v.Activo
FROM Vendedores v
INNER JOIN Terceros t ON v.IdTercero = t.IdTercero
```

## 🌐 Endpoint GET /api/vendedores

El endpoint **YA está haciendo el JOIN correctamente**:

```typescript
let query = `
  SELECT
    v.IdVendedor,
    v.CodigoVendedor,
    v.IdTercero,
    t.NIT,
    t.NombreRazonSocial,
    t.Direccion,  -- ✅ Desde Terceros
    v.Telefono,
    v.Email,
    v.Comision,
    v.Activo,
    v.FechaCreacion,
    v.FechaModificacion
  FROM Vendedores v
  INNER JOIN Terceros t ON v.IdTercero = t.IdTercero
  WHERE 1=1
`;
```

**Respuesta del endpoint**:
```json
[
  {
    "idVendedor": 1,
    "codigoVendedor": "VEN-0001",
    "idTercero": 1,
    "nit": "1091383880",
    "nombreRazonSocial": "Darwin Hurtado",
    "direccion": "Tocancipa",  // ✅ Dirección incluida
    "telefono": null,
    "email": null,
    "comision": 2,
    "activo": true
  }
]
```

## 🔧 Endpoint POST /api/vendedores

El endpoint **YA está guardando la dirección correctamente**:

1. Recibe `direccion` en el body
2. Si el NIT no existe, crea un nuevo `Tercero` con la dirección
3. Si el NIT existe, **actualiza la dirección** si se proporciona una nueva

```typescript
if (nitExistente.recordset.length > 0) {
  // Usar el tercero existente
  idTercero = nitExistente.recordset[0].IdTercero;

  // Actualizar la dirección si se proporciona una nueva
  if (direccion) {
    await transaction.request()
      .input('idTercero', sql.Int, idTercero)
      .input('direccion', sql.VarChar(500), direccion)
      .query('UPDATE Terceros SET Direccion = @direccion WHERE IdTercero = @idTercero');
  }
} else {
  // Crear nuevo Tercero con dirección
  const terceroResult = await transaction.request()
    .input('nit', sql.VarChar(20), nit)
    .input('nombreRazonSocial', sql.VarChar(200), nombreRazonSocial)
    .input('direccion', sql.VarChar(500), direccion || null)
    .input('tipo', sql.VarChar(1), 'V')
    .query(`
      INSERT INTO Terceros (NIT, NombreRazonSocial, Direccion, Tipo, Activo)
      OUTPUT INSERTED.IdTercero
      VALUES (@nit, @nombreRazonSocial, @direccion, @tipo, 1)
    `);
  idTercero = terceroResult.recordset[0].IdTercero;
}
```

## ✅ Verificación

### 1. Verificar que el endpoint retorna la dirección:

```bash
GET http://localhost:3001/api/vendedores
```

**Debería retornar**:
```json
{
  "direccion": "Tocancipa",  // ✅ Presente
  ...
}
```

### 2. Verificar en SQL Server Management Studio:

```sql
-- Ver solo Vendedores (SIN dirección)
SELECT * FROM Vendedores;

-- Ver Vendedores CON dirección (usando JOIN)
SELECT
    v.*,
    t.Direccion,
    t.NIT,
    t.NombreRazonSocial
FROM Vendedores v
INNER JOIN Terceros t ON v.IdTercero = t.IdTercero;
```

### 3. Verificar en el Frontend:

El frontend **YA está mostrando la dirección** en la tabla:

```tsx
<td>{ven.direccion || '-'}</td>
```

## 📝 Resumen

- ✅ La dirección **SÍ se está guardando** (en la tabla `Terceros`)
- ✅ El endpoint **SÍ retorna la dirección** (hace JOIN con `Terceros`)
- ✅ El frontend **SÍ muestra la dirección** (columna en la tabla)
- ⚠️ Al consultar solo `Vendedores` en SQL Server, **NO verás la dirección** porque está en `Terceros`

## 🎯 Solución

Si quieres ver la dirección al consultar en SQL Server Management Studio, usa:

```sql
SELECT
    v.IdVendedor,
    v.CodigoVendedor,
    t.NIT,
    t.NombreRazonSocial,
    t.Direccion,  -- ✅ Dirección desde Terceros
    v.Telefono,
    v.Email,
    v.Comision
FROM Vendedores v
INNER JOIN Terceros t ON v.IdTercero = t.IdTercero;
```

O usa la vista `VistaVendedores`:

```sql
SELECT * FROM VistaVendedores;
```

---

**Fecha**: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
**Estado**: ✅ Estructura correcta, endpoints funcionando

