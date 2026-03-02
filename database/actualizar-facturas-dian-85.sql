-- ============================================
-- Script para actualizar tabla Facturas según Resolución DIAN 000085
-- Sistema Contable - Colombia
-- ============================================

USE MiBaseDeContabilidad;
GO

-- ============================================
-- Agregar campos requeridos por DIAN Resolución 000085
-- ============================================

-- CUFE/CUDE (Código Único de Facturación Electrónica / Código Único de Documento Electrónico)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Facturas]') AND name = 'CUFE')
BEGIN
    ALTER TABLE Facturas
    ADD CUFE NVARCHAR(100) NULL;
    PRINT '✅ Campo CUFE agregado a Facturas';
END
ELSE
BEGIN
    PRINT '⚠️  El campo CUFE ya existe';
END
GO

-- QR Code (Código QR para validación)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Facturas]') AND name = 'QRCode')
BEGIN
    ALTER TABLE Facturas
    ADD QRCode NVARCHAR(MAX) NULL;
    PRINT '✅ Campo QRCode agregado a Facturas';
END
ELSE
BEGIN
    PRINT '⚠️  El campo QRCode ya existe';
END
GO

-- Fecha de validación con DIAN
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Facturas]') AND name = 'FechaValidacionDIAN')
BEGIN
    ALTER TABLE Facturas
    ADD FechaValidacionDIAN DATETIME NULL;
    PRINT '✅ Campo FechaValidacionDIAN agregado a Facturas';
END
ELSE
BEGIN
    PRINT '⚠️  El campo FechaValidacionDIAN ya existe';
END
GO

-- Estado de validación con DIAN
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Facturas]') AND name = 'EstadoValidacionDIAN')
BEGIN
    ALTER TABLE Facturas
    ADD EstadoValidacionDIAN NVARCHAR(20) NULL DEFAULT 'Pendiente';
    -- Valores posibles: Pendiente, Validada, Rechazada, Anulada
    PRINT '✅ Campo EstadoValidacionDIAN agregado a Facturas';
END
ELSE
BEGIN
    PRINT '⚠️  El campo EstadoValidacionDIAN ya existe';
END
GO

-- Mensaje de respuesta de DIAN
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Facturas]') AND name = 'MensajeValidacionDIAN')
BEGIN
    ALTER TABLE Facturas
    ADD MensajeValidacionDIAN NVARCHAR(500) NULL;
    PRINT '✅ Campo MensajeValidacionDIAN agregado a Facturas';
END
ELSE
BEGIN
    PRINT '⚠️  El campo MensajeValidacionDIAN ya existe';
END
GO

-- XML de la factura electrónica
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Facturas]') AND name = 'XMLFactura')
BEGIN
    ALTER TABLE Facturas
    ADD XMLFactura XML NULL;
    PRINT '✅ Campo XMLFactura agregado a Facturas';
END
ELSE
BEGIN
    PRINT '⚠️  El campo XMLFactura ya existe';
END
GO

-- Ambiente (Producción, Pruebas)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Facturas]') AND name = 'AmbienteDIAN')
BEGIN
    ALTER TABLE Facturas
    ADD AmbienteDIAN NVARCHAR(20) NULL DEFAULT 'Pruebas';
    -- Valores: Produccion, Pruebas
    PRINT '✅ Campo AmbienteDIAN agregado a Facturas';
END
ELSE
BEGIN
    PRINT '⚠️  El campo AmbienteDIAN ya existe';
END
GO

-- Fecha de vencimiento (para facturas como título valor)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Facturas]') AND name = 'FechaVencimiento')
BEGIN
    ALTER TABLE Facturas
    ADD FechaVencimiento DATE NULL;
    PRINT '✅ Campo FechaVencimiento agregado a Facturas';
END
ELSE
BEGIN
    PRINT '⚠️  El campo FechaVencimiento ya existe';
END
GO

-- Tipo de documento electrónico (según DIAN)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Facturas]') AND name = 'TipoDocumentoElectronico')
BEGIN
    ALTER TABLE Facturas
    ADD TipoDocumentoElectronico NVARCHAR(10) NULL DEFAULT 'FV';
    -- Valores: FV (Factura de Venta), NC (Nota Crédito), ND (Nota Débito), etc.
    PRINT '✅ Campo TipoDocumentoElectronico agregado a Facturas';
END
ELSE
BEGIN
    PRINT '⚠️  El campo TipoDocumentoElectronico ya existe';
END
GO

-- ============================================
-- Índices para mejorar consultas
-- ============================================

-- Índice en CUFE para búsquedas rápidas
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Facturas_CUFE' AND object_id = OBJECT_ID('Facturas'))
BEGIN
    SET QUOTED_IDENTIFIER ON;
    CREATE INDEX IX_Facturas_CUFE ON Facturas(CUFE) WHERE CUFE IS NOT NULL;
    PRINT '✅ Índice IX_Facturas_CUFE creado';
END
GO

-- Índice en EstadoValidacionDIAN
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Facturas_EstadoValidacionDIAN' AND object_id = OBJECT_ID('Facturas'))
BEGIN
    CREATE INDEX IX_Facturas_EstadoValidacionDIAN ON Facturas(EstadoValidacionDIAN);
    PRINT '✅ Índice IX_Facturas_EstadoValidacionDIAN creado';
END
GO

-- ============================================
-- Tabla para configuración DIAN
-- ============================================

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ConfiguracionDIAN]') AND type in (N'U'))
BEGIN
    CREATE TABLE ConfiguracionDIAN (
        IdConfiguracion INT IDENTITY(1,1) PRIMARY KEY,
        IdEmpresa INT NOT NULL,
        Ambiente NVARCHAR(20) NOT NULL DEFAULT 'Pruebas', -- Produccion, Pruebas
        UsuarioDIAN NVARCHAR(100) NULL,
        PasswordDIAN NVARCHAR(500) NULL, -- Encriptado
        CertificadoDigital VARBINARY(MAX) NULL,
        PasswordCertificado NVARCHAR(500) NULL, -- Encriptado
        FechaVencimientoCertificado DATE NULL,
        URLProduccion NVARCHAR(500) NULL,
        URLPruebas NVARCHAR(500) NULL,
        SoftwareId NVARCHAR(100) NULL, -- ID del software según DIAN
        PinSoftware NVARCHAR(100) NULL, -- PIN del software
        Activo BIT NOT NULL DEFAULT 1,
        FechaCreacion DATETIME DEFAULT GETDATE(),
        FechaModificacion DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (IdEmpresa) REFERENCES Empresa(IdEmpresa)
    );
    PRINT '✅ Tabla ConfiguracionDIAN creada';
END
ELSE
BEGIN
    PRINT '⚠️  La tabla ConfiguracionDIAN ya existe';
END
GO

PRINT '';
PRINT '═══════════════════════════════════════════════════';
PRINT '✅ ACTUALIZACIÓN PARA DIAN RESOLUCIÓN 000085 COMPLETADA';
PRINT '═══════════════════════════════════════════════════';
PRINT '';
PRINT 'Campos agregados:';
PRINT '  - CUFE/CUDE (Código Único de Facturación Electrónica)';
PRINT '  - QRCode (Código QR para validación)';
PRINT '  - FechaValidacionDIAN';
PRINT '  - EstadoValidacionDIAN';
PRINT '  - MensajeValidacionDIAN';
PRINT '  - XMLFactura (XML de la factura electrónica)';
PRINT '  - AmbienteDIAN (Producción/Pruebas)';
PRINT '  - FechaVencimiento';
PRINT '  - TipoDocumentoElectronico';
PRINT '';
PRINT 'Tabla creada:';
PRINT '  - ConfiguracionDIAN (Configuración de conexión con DIAN)';
PRINT '';

