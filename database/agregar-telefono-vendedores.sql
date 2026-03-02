-- ============================================
-- Script para agregar Telefono a Vendedores
-- Sistema Contable - Colombia
-- ============================================

USE MiBaseDeContabilidad;
GO

-- ============================================
-- Agregar campo Telefono a Vendedores
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Vendedores') AND name = 'Telefono')
BEGIN
    ALTER TABLE Vendedores
    ADD Telefono NVARCHAR(20) NULL;
    PRINT '✅ Campo Telefono agregado a la tabla Vendedores';
END
ELSE
BEGIN
    PRINT '⚠️  El campo Telefono ya existe en la tabla Vendedores';
END
GO

-- ============================================
-- Actualizar la vista VistaVendedores
-- ============================================
IF EXISTS (SELECT * FROM sys.views WHERE name = 'VistaVendedores')
BEGIN
    DROP VIEW VistaVendedores;
    PRINT '✅ Vista VistaVendedores eliminada para recreación';
END
GO

-- Verificar que los campos existan antes de crear la vista
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Vendedores') AND name = 'Telefono')
   AND EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Vendedores') AND name = 'Email')
BEGIN
    CREATE VIEW VistaVendedores AS
    SELECT
        v.IdVendedor,
        v.CodigoVendedor,
        v.IdTercero,
        t.NIT,
        t.NombreRazonSocial,
        t.Direccion,
        v.Telefono,
        v.Email,
        v.Comision,
        v.Activo,
        v.FechaCreacion,
        v.FechaModificacion
    FROM Vendedores v
    INNER JOIN Terceros t ON v.IdTercero = t.IdTercero;

    PRINT '✅ Vista VistaVendedores actualizada exitosamente';
END
ELSE
BEGIN
    PRINT '⚠️  No se pudo crear la vista: los campos Telefono o Email no existen';
END
GO

PRINT '';
PRINT '============================================';
PRINT '✅ Script ejecutado exitosamente';
PRINT '============================================';
GO

