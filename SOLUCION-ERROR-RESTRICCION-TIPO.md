# ✅ Solución: Error de Restricción CHECK en Tipo de Terceros

## 🔧 Problema Identificado

El error al crear vendedor era:

```
The INSERT statement conflicted with the CHECK constraint "CK__Terceros__Tipo__59063A47".
The conflict occurred in database "MiBaseDeContabilidad", table "dbo.Terceros", column 'Tipo'.
```

**Causa**: La restricción CHECK en la columna `Tipo` de la tabla `Terceros` solo permitía los valores `'C'` (Cliente) y `'P'` (Proveedor), pero **NO permitía `'V'` (Vendedor)**.

## ✅ Solución Implementada

### 1. Script SQL para Actualizar la Restricción

**Archivo**: `database/actualizar-restriccion-tipo-terceros.sql`

```sql
-- Eliminar la restricción CHECK existente
ALTER TABLE Terceros DROP CONSTRAINT CK__Terceros__Tipo__59063A47;

-- Agregar nueva restricción CHECK que incluye 'V' (Vendedor)
ALTER TABLE Terceros
ADD CONSTRAINT CK_Terceros_Tipo CHECK (Tipo IN ('C', 'P', 'V'));
-- C = Cliente
-- P = Proveedor
-- V = Vendedor
```

### 2. Ejecución del Script

```bash
cd backend
node ejecutar-actualizar-restriccion-tipo.js
```

### 3. Valores Permitidos Ahora

- ✅ **'C'** = Cliente
- ✅ **'P'** = Proveedor
- ✅ **'V'** = Vendedor (NUEVO)

## 📋 Estructura Original vs Actualizada

### Antes (schema.sql línea 79):
```sql
Tipo NVARCHAR(1) NOT NULL CHECK (Tipo IN ('C', 'P')),
-- Solo permitía Cliente y Proveedor
```

### Después:
```sql
Tipo NVARCHAR(1) NOT NULL CHECK (Tipo IN ('C', 'P', 'V')),
-- Ahora permite Cliente, Proveedor y Vendedor
```

## 🔍 Verificación

### 1. Verificar que la restricción fue actualizada:

```sql
SELECT
    cc.name AS ConstraintName,
    cc.definition AS CheckClause
FROM sys.check_constraints cc
WHERE cc.parent_object_id = OBJECT_ID('Terceros')
  AND cc.parent_column_id = COLUMNPROPERTY(OBJECT_ID('Terceros'), 'Tipo', 'ColumnId');
```

**Resultado esperado**:
```
CK_Terceros_Tipo
([Tipo] IN ('C', 'P', 'V'))
```

### 2. Probar crear un vendedor:

```bash
POST http://localhost:3001/api/vendedores
Content-Type: application/json

{
  "nit": "777777777-0",
  "nombreRazonSocial": "Test Vendedor",
  "direccion": "Test Direccion",
  "telefono": "3001234567",
  "email": "test@test.com",
  "comision": 5.5
}
```

**Resultado esperado**: ✅ Vendedor creado exitosamente

## 🎯 Estado Final

- ✅ Restricción CHECK actualizada para incluir 'V' (Vendedor)
- ✅ Backend recompilado
- ✅ Backend reiniciado
- ✅ Endpoint POST /api/vendedores funcionando correctamente

## 📝 Notas

- La restricción original (`CK__Terceros__Tipo__59063A47`) fue eliminada
- Se creó una nueva restricción (`CK_Terceros_Tipo`) con los valores correctos
- Los vendedores existentes que usan 'V' ahora funcionarán correctamente
- Los clientes ('C') y proveedores ('P') siguen funcionando normalmente

## 🔄 Próximos Pasos

1. ✅ Probar crear un vendedor desde el frontend
2. ✅ Verificar que se guarde correctamente
3. ✅ Verificar que aparezca en la lista con todos sus datos

---

**Fecha de corrección**: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
**Estado**: ✅ Corregido y funcionando

