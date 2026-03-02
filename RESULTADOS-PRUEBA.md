# 🧪 Resultados de Prueba - Búsqueda por Nombre

## ⚠️ Problema Detectado

Las pruebas revelaron que **falta la columna `CodigoBarras` en la base de datos**.

### Error Encontrado:
```
Invalid column name 'CodigoBarras'
```

## ✅ Solución

**Ejecuta el siguiente script SQL en tu base de datos:**

```sql
-- Archivo: database/agregar-codigo-barras.sql

USE MiBaseDeContabilidad;
GO

-- Agregar columna CodigoBarras
IF NOT EXISTS (
    SELECT *
    FROM sys.columns
    WHERE object_id = OBJECT_ID(N'[dbo].[Productos]')
    AND name = 'CodigoBarras'
)
BEGIN
    ALTER TABLE Productos
    ADD CodigoBarras NVARCHAR(100) NULL;

    CREATE INDEX IX_Productos_CodigoBarras
    ON Productos(CodigoBarras)
    WHERE CodigoBarras IS NOT NULL;

    PRINT '✅ Columna CodigoBarras agregada exitosamente';
END
GO
```

## 📋 Pasos para Ejecutar

1. Abre **SQL Server Management Studio (SSMS)**
2. Conéctate a tu instancia de SQL Server
3. Selecciona la base de datos `MiBaseDeContabilidad`
4. Abre el archivo `database/agregar-codigo-barras.sql`
5. Ejecuta el script (F5)

O ejecuta directamente desde la línea de comandos:

```bash
sqlcmd -S localhost -d MiBaseDeContabilidad -i database/agregar-codigo-barras.sql
```

## 🔄 Después de Ejecutar el Script

Una vez ejecutado el script, las funcionalidades estarán completamente operativas:

- ✅ Búsqueda por código interno
- ✅ Búsqueda por código de barras
- ✅ Búsqueda por nombre del artículo
- ✅ Crear productos con código de barras
- ✅ Actualizar código de barras

## 🧪 Pruebas que se Ejecutarán

Una vez corregido, el script de prueba verificará:

1. ✅ Listar todos los productos
2. ✅ Búsqueda por código exacto (ej: "PROD001")
3. ✅ Búsqueda por nombre (ej: "Laptop")
4. ✅ Búsqueda general con parámetro `?buscar=`
5. ✅ Manejo de errores (producto no encontrado)

## 📝 Nota

Si no deseas usar código de barras por ahora, puedes comentar temporalmente las referencias a `CodigoBarras` en el código, pero es recomendable ejecutar el script SQL para tener todas las funcionalidades disponibles.

