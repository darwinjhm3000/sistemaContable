-- ============================================
-- Script para actualizar la restricción CHECK de Tipo en Terceros
-- Sistema Contable - Colombia
-- ============================================

USE MiBaseDeContabilidad;
GO

-- ============================================
-- Eliminar la restricción CHECK existente
-- ============================================
DECLARE @ConstraintName NVARCHAR(200);

-- Buscar el nombre de la restricción
SELECT @ConstraintName = name
FROM sys.check_constraints
WHERE parent_object_id = OBJECT_ID('Terceros')
  AND parent_column_id = COLUMNPROPERTY(OBJECT_ID('Terceros'), 'Tipo', 'ColumnId')
  AND definition LIKE '%Tipo%';

IF @ConstraintName IS NOT NULL
BEGIN
    DECLARE @SQL NVARCHAR(MAX);
    SET @SQL = 'ALTER TABLE Terceros DROP CONSTRAINT ' + QUOTENAME(@ConstraintName);
    EXEC sp_executesql @SQL;
    PRINT '✅ Restricción CHECK eliminada: ' + @ConstraintName;
END
ELSE
BEGIN
    PRINT '⚠️  No se encontró la restricción CHECK en Tipo';
END
GO

-- ============================================
-- Agregar nueva restricción CHECK que incluye 'V' (Vendedor)
-- ============================================
IF NOT EXISTS (
    SELECT * FROM sys.check_constraints
    WHERE parent_object_id = OBJECT_ID('Terceros')
      AND definition LIKE '%Tipo%IN%(''C'',''P'',''V'')%'
)
BEGIN
    ALTER TABLE Terceros
    ADD CONSTRAINT CK_Terceros_Tipo CHECK (Tipo IN ('C', 'P', 'V'));
    -- C = Cliente
    -- P = Proveedor
    -- V = Vendedor

    PRINT '✅ Nueva restricción CHECK agregada: Tipo IN (''C'', ''P'', ''V'')';
END
ELSE
BEGIN
    PRINT '⚠️  La restricción CHECK ya existe con los valores correctos';
END
GO

PRINT '';
PRINT '============================================';
PRINT '✅ Script ejecutado exitosamente';
PRINT '============================================';
PRINT '';
PRINT 'Valores permitidos en Tipo:';
PRINT '  C = Cliente';
PRINT '  P = Proveedor';
PRINT '  V = Vendedor';
PRINT '';
GO

