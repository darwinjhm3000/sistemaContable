-- ============================================
-- Script de creación de Base de Datos
-- Sistema Contable - Colombia
-- ============================================

-- Crear la base de datos si no existe
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'MiBaseDeContabilidad')
BEGIN
    CREATE DATABASE MiBaseDeContabilidad;
    PRINT '✅ Base de datos MiBaseDeContabilidad creada exitosamente';
END
ELSE
BEGIN
    PRINT '⚠️  La base de datos MiBaseDeContabilidad ya existe';
END
GO

-- Usar la base de datos
USE MiBaseDeContabilidad;
GO

-- ============================================
-- Tabla: Usuarios
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Usuarios]') AND type in (N'U'))
BEGIN
    CREATE TABLE Usuarios (
        IdUsuario INT IDENTITY(1,1) PRIMARY KEY,
        Usuario NVARCHAR(50) NOT NULL UNIQUE,
        Contraseña NVARCHAR(255) NOT NULL,
        Nombre NVARCHAR(100) NOT NULL,
        Email NVARCHAR(100),
        Activo BIT NOT NULL DEFAULT 1,
        FechaCreacion DATETIME DEFAULT GETDATE(),
        FechaModificacion DATETIME DEFAULT GETDATE()
    );
    PRINT '✅ Tabla Usuarios creada exitosamente';
END
ELSE
BEGIN
    PRINT '⚠️  La tabla Usuarios ya existe';
END
GO

-- ============================================
-- Tabla: CuentasPUC (Plan Único de Cuentas)
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[CuentasPUC]') AND type in (N'U'))
BEGIN
    CREATE TABLE CuentasPUC (
        CodigoCuenta NVARCHAR(20) PRIMARY KEY,
        NombreCuenta NVARCHAR(200) NOT NULL,
        Naturaleza NVARCHAR(1) NOT NULL CHECK (Naturaleza IN ('D', 'C')), -- D=Débito, C=Crédito
        Nivel INT NOT NULL CHECK (Nivel BETWEEN 1 AND 4),
        CodigoPadre NVARCHAR(20) NULL,
        Activa BIT NOT NULL DEFAULT 1,
        FechaCreacion DATETIME DEFAULT GETDATE(),
        FechaModificacion DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (CodigoPadre) REFERENCES CuentasPUC(CodigoCuenta)
    );
    PRINT '✅ Tabla CuentasPUC creada exitosamente';
END
ELSE
BEGIN
    PRINT '⚠️  La tabla CuentasPUC ya existe';
END
GO

-- ============================================
-- Tabla: Terceros
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Terceros]') AND type in (N'U'))
BEGIN
    CREATE TABLE Terceros (
        IdTercero INT IDENTITY(1,1) PRIMARY KEY,
        NIT NVARCHAR(20) NOT NULL UNIQUE,
        NombreRazonSocial NVARCHAR(200) NOT NULL,
        Direccion NVARCHAR(500),
        Tipo NVARCHAR(1) NOT NULL CHECK (Tipo IN ('C', 'P')), -- C=Cliente, P=Proveedor
        Activo BIT NOT NULL DEFAULT 1,
        FechaCreacion DATETIME DEFAULT GETDATE(),
        FechaModificacion DATETIME DEFAULT GETDATE()
    );
    PRINT '✅ Tabla Terceros creada exitosamente';
END
ELSE
BEGIN
    PRINT '⚠️  La tabla Terceros ya existe';
END
GO

-- ============================================
-- Tabla: Comprobantes
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Comprobantes]') AND type in (N'U'))
BEGIN
    CREATE TABLE Comprobantes (
        IdComprobante INT IDENTITY(1,1) PRIMARY KEY,
        Fecha DATE NOT NULL,
        Descripcion NVARCHAR(500) NOT NULL,
        TotalDebito DECIMAL(18, 2) NOT NULL DEFAULT 0,
        TotalCredito DECIMAL(18, 2) NOT NULL DEFAULT 0,
        IdUsuarioCreacion INT NOT NULL,
        FechaCreacion DATETIME DEFAULT GETDATE(),
        FechaModificacion DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (IdUsuarioCreacion) REFERENCES Usuarios(IdUsuario),
        CONSTRAINT CK_Comprobantes_PartidaDoble CHECK (TotalDebito = TotalCredito)
    );
    PRINT '✅ Tabla Comprobantes creada exitosamente';
END
ELSE
BEGIN
    PRINT '⚠️  La tabla Comprobantes ya existe';
END
GO

-- ============================================
-- Tabla: DetalleComprobante
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[DetalleComprobante]') AND type in (N'U'))
BEGIN
    CREATE TABLE DetalleComprobante (
        IdMovimiento INT IDENTITY(1,1) PRIMARY KEY,
        IdComprobante INT NOT NULL,
        CodigoCuenta NVARCHAR(20) NOT NULL,
        IdTercero INT NULL,
        ValorDebito DECIMAL(18, 2) NOT NULL DEFAULT 0,
        ValorCredito DECIMAL(18, 2) NOT NULL DEFAULT 0,
        FechaCreacion DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (IdComprobante) REFERENCES Comprobantes(IdComprobante) ON DELETE CASCADE,
        FOREIGN KEY (CodigoCuenta) REFERENCES CuentasPUC(CodigoCuenta),
        FOREIGN KEY (IdTercero) REFERENCES Terceros(IdTercero),
        CONSTRAINT CK_DetalleComprobante_ValorUnico CHECK (
            (ValorDebito > 0 AND ValorCredito = 0) OR
            (ValorDebito = 0 AND ValorCredito > 0)
        )
    );
    PRINT '✅ Tabla DetalleComprobante creada exitosamente';
END
ELSE
BEGIN
    PRINT '⚠️  La tabla DetalleComprobante ya existe';
END
GO

-- ============================================
-- Índices para mejorar el rendimiento
-- ============================================

-- Índice en Usuarios.Usuario
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Usuarios_Usuario')
BEGIN
    CREATE INDEX IX_Usuarios_Usuario ON Usuarios(Usuario);
    PRINT '✅ Índice IX_Usuarios_Usuario creado';
END
GO

-- Índice en CuentasPUC.CodigoPadre
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_CuentasPUC_CodigoPadre')
BEGIN
    CREATE INDEX IX_CuentasPUC_CodigoPadre ON CuentasPUC(CodigoPadre);
    PRINT '✅ Índice IX_CuentasPUC_CodigoPadre creado';
END
GO

-- Índice en CuentasPUC.Activa
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_CuentasPUC_Activa')
BEGIN
    CREATE INDEX IX_CuentasPUC_Activa ON CuentasPUC(Activa);
    PRINT '✅ Índice IX_CuentasPUC_Activa creado';
END
GO

-- Índice en DetalleComprobante.IdComprobante
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_DetalleComprobante_IdComprobante')
BEGIN
    CREATE INDEX IX_DetalleComprobante_IdComprobante ON DetalleComprobante(IdComprobante);
    PRINT '✅ Índice IX_DetalleComprobante_IdComprobante creado';
END
GO

-- Índice en Comprobantes.Fecha
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Comprobantes_Fecha')
BEGIN
    CREATE INDEX IX_Comprobantes_Fecha ON Comprobantes(Fecha);
    PRINT '✅ Índice IX_Comprobantes_Fecha creado';
END
GO

PRINT '';
PRINT '═══════════════════════════════════════════════════';
PRINT '✅ ESTRUCTURA DE BASE DE DATOS CREADA EXITOSAMENTE';
PRINT '═══════════════════════════════════════════════════';
PRINT '';
PRINT 'Ejecuta el script de datos iniciales para poblar las tablas.';
PRINT '';


