-- ============================================
-- Script de creación de tabla Proveedores
-- Sistema Contable - Colombia
-- ============================================

USE MiBaseDeContabilidad;
GO

-- ============================================
-- Tabla: Proveedores
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Proveedores]') AND type in (N'U'))
BEGIN
    CREATE TABLE Proveedores (
        IdProveedor INT IDENTITY(1,1) PRIMARY KEY,
        IdTercero INT NOT NULL UNIQUE, -- Relación con Terceros
        CodigoProveedor NVARCHAR(50) NULL UNIQUE, -- Código interno del proveedor
        Telefono NVARCHAR(20),
        Celular NVARCHAR(20),
        Email NVARCHAR(100),
        Ciudad NVARCHAR(100),
        Departamento NVARCHAR(100),
        TipoPersona NVARCHAR(1) NOT NULL DEFAULT 'J' CHECK (TipoPersona IN ('N', 'J')), -- N=Natural, J=Jurídica
        RegimenTributario NVARCHAR(50), -- Simplificado, Común, etc.
        CondicionPago NVARCHAR(20) DEFAULT 'Contado', -- Contado, 30 días, 60 días, etc.
        PlazoEntrega INT DEFAULT 0, -- Plazo de entrega en días
        Observaciones NVARCHAR(1000),
        Activo BIT NOT NULL DEFAULT 1,
        FechaCreacion DATETIME DEFAULT GETDATE(),
        FechaModificacion DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (IdTercero) REFERENCES Terceros(IdTercero) ON DELETE CASCADE
    );
    PRINT '✅ Tabla Proveedores creada exitosamente';
END
ELSE
BEGIN
    PRINT '⚠️  La tabla Proveedores ya existe';
END
GO

-- ============================================
-- Índices para mejorar el rendimiento
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Proveedores_CodigoProveedor' AND object_id = OBJECT_ID('Proveedores'))
BEGIN
    CREATE INDEX IX_Proveedores_CodigoProveedor ON Proveedores(CodigoProveedor);
    PRINT '✅ Índice IX_Proveedores_CodigoProveedor creado';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Proveedores_Activo' AND object_id = OBJECT_ID('Proveedores'))
BEGIN
    CREATE INDEX IX_Proveedores_Activo ON Proveedores(Activo);
    PRINT '✅ Índice IX_Proveedores_Activo creado';
END
GO

-- ============================================
-- Vista: VistaProveedores
-- ============================================
IF EXISTS (SELECT * FROM sys.views WHERE name = 'VistaProveedores')
BEGIN
    DROP VIEW VistaProveedores;
END
GO

CREATE VIEW VistaProveedores AS
SELECT
    p.IdProveedor,
    p.IdTercero,
    p.CodigoProveedor,
    t.NIT,
    t.NombreRazonSocial,
    t.Direccion,
    p.Telefono,
    p.Celular,
    p.Email,
    p.Ciudad,
    p.Departamento,
    p.TipoPersona,
    p.RegimenTributario,
    p.CondicionPago,
    p.PlazoEntrega,
    p.Observaciones,
    p.Activo,
    p.FechaCreacion,
    p.FechaModificacion
FROM Proveedores p
INNER JOIN Terceros t ON p.IdTercero = t.IdTercero;
GO

PRINT '✅ Vista VistaProveedores creada exitosamente';
GO

PRINT '';
PRINT '============================================';
PRINT '✅ Script de Proveedores ejecutado exitosamente';
PRINT '============================================';
GO

