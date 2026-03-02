-- ============================================
-- Script de creación de tabla Vendedores
-- Sistema Contable - Colombia
-- ============================================

USE MiBaseDeContabilidad;
GO

-- ============================================
-- Tabla: Vendedores
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Vendedores]') AND type in (N'U'))
BEGIN
    CREATE TABLE Vendedores (
        IdVendedor INT IDENTITY(1,1) PRIMARY KEY,
        CodigoVendedor NVARCHAR(20) NOT NULL UNIQUE,
        IdTercero INT NOT NULL, -- Relación con Terceros (persona)
        Comision DECIMAL(5, 2) NOT NULL DEFAULT 0, -- Porcentaje de comisión
        Activo BIT NOT NULL DEFAULT 1,
        FechaCreacion DATETIME DEFAULT GETDATE(),
        FechaModificacion DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (IdTercero) REFERENCES Terceros(IdTercero),
        CONSTRAINT UQ_Vendedores_Codigo UNIQUE (CodigoVendedor)
    );
    PRINT '✅ Tabla Vendedores creada exitosamente';
END
ELSE
BEGIN
    PRINT '⚠️  La tabla Vendedores ya existe';
END
GO

-- ============================================
-- Índices para mejorar el rendimiento
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Vendedores_CodigoVendedor' AND object_id = OBJECT_ID('Vendedores'))
BEGIN
    CREATE INDEX IX_Vendedores_CodigoVendedor ON Vendedores(CodigoVendedor);
    PRINT '✅ Índice IX_Vendedores_CodigoVendedor creado';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Vendedores_Activo' AND object_id = OBJECT_ID('Vendedores'))
BEGIN
    CREATE INDEX IX_Vendedores_Activo ON Vendedores(Activo);
    PRINT '✅ Índice IX_Vendedores_Activo creado';
END
GO

-- ============================================
-- Vista: VistaVendedores
-- ============================================
IF EXISTS (SELECT * FROM sys.views WHERE name = 'VistaVendedores')
BEGIN
    DROP VIEW VistaVendedores;
END
GO

CREATE VIEW VistaVendedores AS
SELECT
    v.IdVendedor,
    v.CodigoVendedor,
    v.IdTercero,
    t.NIT,
    t.NombreRazonSocial,
    t.Direccion,
    v.Comision,
    v.Activo,
    v.FechaCreacion,
    v.FechaModificacion
FROM Vendedores v
INNER JOIN Terceros t ON v.IdTercero = t.IdTercero;
GO

PRINT '✅ Vista VistaVendedores creada exitosamente';
GO

-- ============================================
-- Agregar campo IdVendedor a la tabla Facturas
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Facturas') AND name = 'IdVendedor')
BEGIN
    ALTER TABLE Facturas
    ADD IdVendedor INT NULL;

    ALTER TABLE Facturas
    ADD CONSTRAINT FK_Facturas_Vendedores
    FOREIGN KEY (IdVendedor) REFERENCES Vendedores(IdVendedor);

    PRINT '✅ Campo IdVendedor agregado a la tabla Facturas';
END
ELSE
BEGIN
    PRINT '⚠️  El campo IdVendedor ya existe en la tabla Facturas';
END
GO

PRINT '';
PRINT '============================================';
PRINT '✅ Script de Vendedores ejecutado exitosamente';
PRINT '============================================';
GO

