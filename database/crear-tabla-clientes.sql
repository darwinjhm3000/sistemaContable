-- ============================================
-- Script para crear tabla Clientes
-- Sistema Contable - Colombia
-- ============================================

USE MiBaseDeContabilidad;
GO

-- ============================================
-- Tabla: Clientes
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Clientes]') AND type in (N'U'))
BEGIN
    CREATE TABLE Clientes (
        IdCliente INT IDENTITY(1,1) PRIMARY KEY,
        IdTercero INT NOT NULL UNIQUE, -- Relación con Terceros
        CodigoCliente NVARCHAR(50) NULL UNIQUE, -- Código interno del cliente
        Telefono NVARCHAR(20),
        Celular NVARCHAR(20),
        Email NVARCHAR(100),
        Ciudad NVARCHAR(100),
        Departamento NVARCHAR(100),
        TipoPersona NVARCHAR(1) NOT NULL DEFAULT 'J' CHECK (TipoPersona IN ('N', 'J')), -- N=Natural, J=Jurídica
        RegimenTributario NVARCHAR(50), -- Simplificado, Común, etc.
        CondicionPago NVARCHAR(20) DEFAULT 'Contado', -- Contado, 30 días, 60 días, etc.
        LimiteCredito DECIMAL(18, 2) DEFAULT 0, -- Límite de crédito
        SaldoActual DECIMAL(18, 2) DEFAULT 0, -- Saldo actual del cliente
        Descuento DECIMAL(5, 2) DEFAULT 0, -- Porcentaje de descuento por defecto
        Observaciones NVARCHAR(1000),
        Activo BIT NOT NULL DEFAULT 1,
        FechaCreacion DATETIME DEFAULT GETDATE(),
        FechaModificacion DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (IdTercero) REFERENCES Terceros(IdTercero) ON DELETE CASCADE
    );
    PRINT '✅ Tabla Clientes creada exitosamente';
END
ELSE
BEGIN
    PRINT '⚠️  La tabla Clientes ya existe';
END
GO

-- ============================================
-- Índices para mejorar el rendimiento
-- ============================================

-- Índice en CodigoCliente
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Clientes_CodigoCliente' AND object_id = OBJECT_ID('Clientes'))
BEGIN
    CREATE INDEX IX_Clientes_CodigoCliente ON Clientes(CodigoCliente) WHERE CodigoCliente IS NOT NULL;
    PRINT '✅ Índice IX_Clientes_CodigoCliente creado';
END
GO

-- Índice en Email
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Clientes_Email' AND object_id = OBJECT_ID('Clientes'))
BEGIN
    CREATE INDEX IX_Clientes_Email ON Clientes(Email) WHERE Email IS NOT NULL;
    PRINT '✅ Índice IX_Clientes_Email creado';
END
GO

-- Índice en Activo
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Clientes_Activo' AND object_id = OBJECT_ID('Clientes'))
BEGIN
    CREATE INDEX IX_Clientes_Activo ON Clientes(Activo);
    PRINT '✅ Índice IX_Clientes_Activo creado';
END
GO

-- ============================================
-- Vista: VistaClientes (combina Clientes y Terceros)
-- ============================================
IF EXISTS (SELECT * FROM sys.views WHERE name = 'VistaClientes')
BEGIN
    DROP VIEW VistaClientes;
END
GO

CREATE VIEW VistaClientes AS
SELECT
    c.IdCliente,
    c.IdTercero,
    c.CodigoCliente,
    t.NIT,
    t.NombreRazonSocial,
    t.Direccion,
    c.Telefono,
    c.Celular,
    c.Email,
    c.Ciudad,
    c.Departamento,
    c.TipoPersona,
    c.RegimenTributario,
    c.CondicionPago,
    c.LimiteCredito,
    c.SaldoActual,
    c.Descuento,
    c.Observaciones,
    c.Activo,
    c.FechaCreacion,
    c.FechaModificacion
FROM Clientes c
INNER JOIN Terceros t ON c.IdTercero = t.IdTercero
WHERE c.Activo = 1 AND t.Activo = 1;
GO

PRINT '✅ Vista VistaClientes creada exitosamente';
GO

-- ============================================
-- Migrar datos existentes (opcional)
-- Si ya hay terceros tipo 'C', crear registros en Clientes
-- ============================================
PRINT '';
PRINT 'Migrando terceros tipo Cliente a tabla Clientes...';

INSERT INTO Clientes (IdTercero, CodigoCliente, Activo)
SELECT
    IdTercero,
    'CLI-' + RIGHT('0000' + CAST(IdTercero AS NVARCHAR), 4) AS CodigoCliente,
    Activo
FROM Terceros
WHERE Tipo = 'C'
  AND Activo = 1
  AND IdTercero NOT IN (SELECT IdTercero FROM Clientes);

IF @@ROWCOUNT > 0
BEGIN
    PRINT CONCAT('✅ ', @@ROWCOUNT, ' cliente(s) migrado(s) desde Terceros');
END
ELSE
BEGIN
    PRINT '⚠️  No hay terceros tipo Cliente para migrar o ya fueron migrados';
END
GO

PRINT '';
PRINT '═══════════════════════════════════════════════════';
PRINT '✅ TABLA CLIENTES CREADA EXITOSAMENTE';
PRINT '═══════════════════════════════════════════════════';
PRINT '';
PRINT 'La tabla Clientes está lista para usar.';
PRINT 'Los clientes existentes en Terceros han sido migrados automáticamente.';
PRINT '';

