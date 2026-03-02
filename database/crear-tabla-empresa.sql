-- ============================================
-- Tabla: Empresa
-- ============================================
USE MiBaseDeContabilidad;
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Empresa]') AND type in (N'U'))
BEGIN
    CREATE TABLE Empresa (
        IdEmpresa INT IDENTITY(1,1) PRIMARY KEY,
        Nit NVARCHAR(20) NOT NULL UNIQUE,
        NombreRazonSocial NVARCHAR(200) NOT NULL,
        Direccion NVARCHAR(500) NULL,
        Telefono NVARCHAR(20) NULL,
        Celular NVARCHAR(20) NULL,
        Email NVARCHAR(100) NULL,
        Ciudad NVARCHAR(100) NULL,
        Departamento NVARCHAR(100) NULL,
        RegimenTributario NVARCHAR(100) NULL,
        RepresentanteLegal NVARCHAR(200) NULL,
        Logo NVARCHAR(500) NULL, -- Ruta o URL del logo
        Activa BIT NOT NULL DEFAULT 1,
        FechaCreacion DATETIME NOT NULL DEFAULT GETDATE(),
        FechaModificacion DATETIME NULL
    );
    PRINT '✅ Tabla Empresa creada exitosamente';
END
ELSE
BEGIN
    PRINT '⚠️  La tabla Empresa ya existe';
END
GO

-- Crear índice único en NIT
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Empresa_Nit' AND object_id = OBJECT_ID('Empresa'))
BEGIN
    CREATE UNIQUE INDEX IX_Empresa_Nit ON Empresa(Nit);
    PRINT '✅ Índice IX_Empresa_Nit creado';
END
GO

-- Agregar campo IdEmpresa a la tabla Usuarios si no existe
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Usuarios') AND name = 'IdEmpresa')
BEGIN
    ALTER TABLE Usuarios
    ADD IdEmpresa INT NULL;

    -- Agregar foreign key
    ALTER TABLE Usuarios
    ADD CONSTRAINT FK_Usuarios_Empresa FOREIGN KEY (IdEmpresa) REFERENCES Empresa(IdEmpresa);

    PRINT '✅ Campo IdEmpresa agregado a Usuarios';
END
ELSE
BEGIN
    PRINT '⚠️  El campo IdEmpresa ya existe en Usuarios';
END
GO

-- Agregar campo IdEmpresa a la tabla Facturas si no existe
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Facturas') AND name = 'IdEmpresa')
BEGIN
    ALTER TABLE Facturas
    ADD IdEmpresa INT NULL;

    -- Agregar foreign key
    ALTER TABLE Facturas
    ADD CONSTRAINT FK_Facturas_Empresa FOREIGN KEY (IdEmpresa) REFERENCES Empresa(IdEmpresa);

    PRINT '✅ Campo IdEmpresa agregado a Facturas';
END
ELSE
BEGIN
    PRINT '⚠️  El campo IdEmpresa ya existe en Facturas';
END
GO

-- Insertar empresa por defecto si no existe ninguna
IF NOT EXISTS (SELECT * FROM Empresa)
BEGIN
    INSERT INTO Empresa (
        Nit,
        NombreRazonSocial,
        Direccion,
        Telefono,
        Email,
        Ciudad,
        Departamento,
        RegimenTributario,
        Activa
    ) VALUES (
        '900123456-7',
        'Mi Empresa S.A.S',
        'Calle 123 #45-67',
        '6012345678',
        'contacto@miempresa.com',
        'Bogotá',
        'Cundinamarca',
        'Régimen Simplificado',
        1
    );
    PRINT '✅ Empresa por defecto creada';
END
GO

PRINT '';
PRINT '═══════════════════════════════════════════════════';
PRINT '✅ Script de Empresa ejecutado correctamente';
PRINT '═══════════════════════════════════════════════════';
GO

