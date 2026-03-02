-- ============================================
-- Script para agregar campo CodigoBarras a Productos
-- ============================================

USE MiBaseDeContabilidad;
GO

-- Verificar si la columna ya existe
IF NOT EXISTS (
    SELECT *
    FROM sys.columns
    WHERE object_id = OBJECT_ID(N'[dbo].[Productos]')
    AND name = 'CodigoBarras'
)
BEGIN
    -- Agregar columna CodigoBarras
    ALTER TABLE Productos
    ADD CodigoBarras NVARCHAR(100) NULL;

    -- Crear índice único para búsquedas rápidas (opcional, solo si el código de barras debe ser único)
    -- Si un producto puede tener múltiples códigos de barras, no usar UNIQUE
    -- CREATE UNIQUE INDEX IX_Productos_CodigoBarras ON Productos(CodigoBarras) WHERE CodigoBarras IS NOT NULL;

    -- Crear índice no único para búsquedas rápidas
    CREATE INDEX IX_Productos_CodigoBarras ON Productos(CodigoBarras) WHERE CodigoBarras IS NOT NULL;

    PRINT '✅ Columna CodigoBarras agregada exitosamente a la tabla Productos';
    PRINT '✅ Índice creado para búsquedas rápidas por código de barras';
END
ELSE
BEGIN
    PRINT '⚠️  La columna CodigoBarras ya existe en la tabla Productos';
END
GO

-- Actualizar productos existentes con códigos de barras de ejemplo (opcional)
-- Puedes comentar esta sección si no deseas datos de ejemplo
/*
UPDATE Productos
SET CodigoBarras = '1234567890123'
WHERE Codigo = 'PROD001';

UPDATE Productos
SET CodigoBarras = '1234567890124'
WHERE Codigo = 'PROD002';

UPDATE Productos
SET CodigoBarras = '1234567890125'
WHERE Codigo = 'PROD003';
*/

PRINT '✅ Script completado exitosamente';
GO

