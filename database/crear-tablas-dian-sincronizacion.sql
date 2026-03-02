-- ============================================
-- Script para crear tablas de sincronización DIAN
-- Sistema Contable - Colombia
-- ============================================

USE MiBaseDeContabilidad;
GO

-- ============================================
-- Tabla para logs de sincronización
-- ============================================

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[LogSincronizacionDIAN]') AND type in (N'U'))
BEGIN
    CREATE TABLE LogSincronizacionDIAN (
        IdLog INT IDENTITY(1,1) PRIMARY KEY,
        IdEmpresa INT NOT NULL,
        FechaInicio DATETIME NOT NULL DEFAULT GETDATE(),
        FechaFin DATETIME NULL,
        TipoSincronizacion NVARCHAR(50) NOT NULL, -- 'Facturas', 'Compras'
        RangoFechas NVARCHAR(100) NULL, -- '2024-01-01 a 2024-01-31'
        DocumentosEncontrados INT DEFAULT 0,
        DocumentosProcesados INT DEFAULT 0,
        DocumentosConError INT DEFAULT 0,
        Estado NVARCHAR(20) NOT NULL DEFAULT 'EnProceso', -- 'EnProceso', 'Completado', 'Error'
        MensajeError NVARCHAR(MAX) NULL,
        FechaCreacion DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (IdEmpresa) REFERENCES Empresa(IdEmpresa)
    );
    PRINT '✅ Tabla LogSincronizacionDIAN creada';
END
ELSE
BEGIN
    PRINT '⚠️  La tabla LogSincronizacionDIAN ya existe';
END
GO

-- Índice para mejorar consultas por empresa y fecha
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_LogSincronizacionDIAN_IdEmpresa' AND object_id = OBJECT_ID('LogSincronizacionDIAN'))
BEGIN
    CREATE INDEX IX_LogSincronizacionDIAN_IdEmpresa ON LogSincronizacionDIAN(IdEmpresa);
    PRINT '✅ Índice IX_LogSincronizacionDIAN_IdEmpresa creado';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_LogSincronizacionDIAN_FechaInicio' AND object_id = OBJECT_ID('LogSincronizacionDIAN'))
BEGIN
    CREATE INDEX IX_LogSincronizacionDIAN_FechaInicio ON LogSincronizacionDIAN(FechaInicio DESC);
    PRINT '✅ Índice IX_LogSincronizacionDIAN_FechaInicio creado';
END
GO

-- ============================================
-- Tabla para eventos DIAN
-- ============================================

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[EventosDIAN]') AND type in (N'U'))
BEGIN
    CREATE TABLE EventosDIAN (
        IdEvento INT IDENTITY(1,1) PRIMARY KEY,
        TrackId NVARCHAR(100) NULL,
        CUFE NVARCHAR(100) NULL,
        IdFactura INT NULL, -- Referencia a factura local si existe
        IdCompra INT NULL,  -- Referencia a compra local si existe
        TipoDocumento NVARCHAR(10) NULL, -- 'FV', 'NC', 'ND', 'DS'
        Estado NVARCHAR(50) NULL, -- 'Aceptado', 'Rechazado', 'Anulado', 'Pendiente'
        FechaEvento DATETIME NULL,
        FechaEmision DATETIME NULL,
        NITEmisor NVARCHAR(20) NULL,
        NITReceptor NVARCHAR(20) NULL,
        NumeroDocumento NVARCHAR(50) NULL,
        ValorTotal DECIMAL(18,2) NULL,
        Mensaje NVARCHAR(500) NULL,
        XMLRespuesta XML NULL,
        FechaConsulta DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (IdFactura) REFERENCES Facturas(IdFactura),
        FOREIGN KEY (IdCompra) REFERENCES Compras(IdCompra)
    );
    PRINT '✅ Tabla EventosDIAN creada';
END
ELSE
BEGIN
    PRINT '⚠️  La tabla EventosDIAN ya existe';
END
GO

-- Índice único para TrackId
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_EventosDIAN_TrackId' AND object_id = OBJECT_ID('EventosDIAN'))
BEGIN
    CREATE UNIQUE INDEX IX_EventosDIAN_TrackId ON EventosDIAN(TrackId) WHERE TrackId IS NOT NULL;
    PRINT '✅ Índice único IX_EventosDIAN_TrackId creado';
END
GO

-- Índice para CUFE
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_EventosDIAN_CUFE' AND object_id = OBJECT_ID('EventosDIAN'))
BEGIN
    CREATE INDEX IX_EventosDIAN_CUFE ON EventosDIAN(CUFE) WHERE CUFE IS NOT NULL;
    PRINT '✅ Índice IX_EventosDIAN_CUFE creado';
END
GO

-- Índice para consultas por fecha
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_EventosDIAN_FechaEvento' AND object_id = OBJECT_ID('EventosDIAN'))
BEGIN
    CREATE INDEX IX_EventosDIAN_FechaEvento ON EventosDIAN(FechaEvento DESC) WHERE FechaEvento IS NOT NULL;
    PRINT '✅ Índice IX_EventosDIAN_FechaEvento creado';
END
GO

-- Índice para IdFactura
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_EventosDIAN_IdFactura' AND object_id = OBJECT_ID('EventosDIAN'))
BEGIN
    CREATE INDEX IX_EventosDIAN_IdFactura ON EventosDIAN(IdFactura) WHERE IdFactura IS NOT NULL;
    PRINT '✅ Índice IX_EventosDIAN_IdFactura creado';
END
GO

PRINT '';
PRINT '═══════════════════════════════════════════════════';
PRINT '✅ TABLAS DE SINCRONIZACIÓN DIAN CREADAS';
PRINT '═══════════════════════════════════════════════════';
PRINT '';
PRINT 'Tablas creadas:';
PRINT '  - LogSincronizacionDIAN (Logs de sincronización)';
PRINT '  - EventosDIAN (Eventos de documentos DIAN)';
PRINT '';
PRINT 'Índices creados para optimización de consultas';
PRINT '';
