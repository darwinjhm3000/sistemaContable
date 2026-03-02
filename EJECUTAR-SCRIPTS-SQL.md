# 📋 Instrucciones para Ejecutar los Scripts SQL

## ⚠️ Nota Importante

Los scripts Node.js fallaron porque requieren credenciales correctas de la base de datos. Debes ejecutar los scripts SQL manualmente en SQL Server Management Studio.

## 📝 Scripts a Ejecutar

### 1. Script de Vendedores
**Archivo**: `database/crear-tabla-vendedores.sql`

**Contenido**:
- Crea la tabla `Vendedores`
- Crea la vista `VistaVendedores`
- Agrega el campo `IdVendedor` a la tabla `Facturas`
- Crea índices para mejorar el rendimiento

### 2. Script de Proveedores
**Archivo**: `database/crear-tabla-proveedores.sql`

**Contenido**:
- Crea la tabla `Proveedores`
- Crea la vista `VistaProveedores`
- Crea índices para mejorar el rendimiento

## 🔧 Pasos para Ejecutar

### Opción 1: SQL Server Management Studio (SSMS)

1. Abre SQL Server Management Studio
2. Conéctate a tu servidor de base de datos
3. Selecciona la base de datos `MiBaseDeContabilidad`
4. Abre el archivo `database/crear-tabla-vendedores.sql`
5. Ejecuta el script (F5 o botón "Execute")
6. Repite con `database/crear-tabla-proveedores.sql`

### Opción 2: sqlcmd (Línea de comandos)

```powershell
# Ejecutar script de vendedores
sqlcmd -S localhost -d MiBaseDeContabilidad -U sa -P TuPassword123! -i database\crear-tabla-vendedores.sql

# Ejecutar script de proveedores
sqlcmd -S localhost -d MiBaseDeContabilidad -U sa -P TuPassword123! -i database\crear-tabla-proveedores.sql
```

**Nota**: Reemplaza `TuPassword123!` con tu contraseña real de SQL Server.

### Opción 3: Actualizar credenciales en los scripts Node.js

Si prefieres usar los scripts Node.js, actualiza las credenciales en:
- `backend/ejecutar-crear-vendedores.js`
- `backend/ejecutar-crear-proveedores.js`

O crea un archivo `.env` en la carpeta `backend` con:
```
DB_SERVER=localhost
DB_NAME=MiBaseDeContabilidad
DB_USER=sa
DB_PASSWORD=TuPasswordReal
```

## ✅ Verificación

Después de ejecutar los scripts, verifica que las tablas se crearon:

```sql
-- Verificar tabla Vendedores
SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Vendedores';

-- Verificar tabla Proveedores
SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Proveedores';

-- Verificar campo IdVendedor en Facturas
SELECT COLUMN_NAME, DATA_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'Facturas' AND COLUMN_NAME = 'IdVendedor';
```

## 🔄 Servicios

Los servicios (backend y frontend) ya están reiniciándose en segundo plano. Una vez que ejecutes los scripts SQL, todo debería funcionar correctamente.

---

**Estado**: ⚠️ Scripts SQL pendientes de ejecución manual
**Servicios**: ✅ Reiniciándose

