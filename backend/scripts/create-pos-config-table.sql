-- ============================================
-- Tabla: ConfiguracionPOS
-- Configuración administrativa del Punto de Venta
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ConfiguracionPOS')
BEGIN
    CREATE TABLE ConfiguracionPOS (
        IdConfiguracionPOS INT IDENTITY(1,1) PRIMARY KEY,
        BloquearModificacionPrecio BIT NOT NULL DEFAULT 0,
        BloquearModificacionIVA BIT NOT NULL DEFAULT 0,
        BloquearModificacionTotal BIT NOT NULL DEFAULT 0,
        PermitirDescuentos BIT NOT NULL DEFAULT 1,
        PorcentajeDescuentoMaximo DECIMAL(5,2) NULL,
        UsarCodigoBarras BIT NOT NULL DEFAULT 1,
        MostrarStock BIT NOT NULL DEFAULT 1,
        ValidarStock BIT NOT NULL DEFAULT 1,
        RequerirCliente BIT NOT NULL DEFAULT 0,
        ClientePorDefecto INT NULL,
        VendedorPorDefecto INT NULL,
        IdEmpresa INT NOT NULL,
        Activo BIT NOT NULL DEFAULT 1,
        FechaCreacion DATETIME NOT NULL DEFAULT GETDATE(),
        FechaModificacion DATETIME NULL,
        IdUsuarioCreacion INT NOT NULL,
        IdUsuarioModificacion INT NULL
        -- Foreign Keys comentadas temporalmente para evitar errores si las tablas referenciadas no existen
        -- Se pueden agregar después cuando todas las tablas estén creadas
        -- CONSTRAINT FK_ConfiguracionPOS_Empresa FOREIGN KEY (IdEmpresa) REFERENCES Empresa(IdEmpresa),
        -- CONSTRAINT FK_ConfiguracionPOS_Cliente FOREIGN KEY (ClientePorDefecto) REFERENCES Clientes(IdCliente),
        -- CONSTRAINT FK_ConfiguracionPOS_Vendedor FOREIGN KEY (VendedorPorDefecto) REFERENCES Vendedores(IdVendedor),
        -- CONSTRAINT FK_ConfiguracionPOS_UsuarioCreacion FOREIGN KEY (IdUsuarioCreacion) REFERENCES Usuarios(IdUsuario),
        -- CONSTRAINT FK_ConfiguracionPOS_UsuarioModificacion FOREIGN KEY (IdUsuarioModificacion) REFERENCES Usuarios(IdUsuario)
    );

    PRINT '✅ Tabla ConfiguracionPOS creada exitosamente';
END
ELSE
BEGIN
    PRINT '⚠️  La tabla ConfiguracionPOS ya existe';
END
GO

-- ============================================
-- Índices
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ConfiguracionPOS_Empresa')
BEGIN
    CREATE INDEX IX_ConfiguracionPOS_Empresa ON ConfiguracionPOS(IdEmpresa);
    PRINT '✅ Índice IX_ConfiguracionPOS_Empresa creado';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ConfiguracionPOS_Activo')
BEGIN
    CREATE INDEX IX_ConfiguracionPOS_Activo ON ConfiguracionPOS(Activo);
    PRINT '✅ Índice IX_ConfiguracionPOS_Activo creado';
END
GO

-- ============================================
-- Insertar configuración por defecto para cada empresa (si la tabla Empresa existe)
-- ============================================
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'Empresa')
BEGIN
    INSERT INTO ConfiguracionPOS (
        BloquearModificacionPrecio,
        BloquearModificacionIVA,
        BloquearModificacionTotal,
        PermitirDescuentos,
        PorcentajeDescuentoMaximo,
        UsarCodigoBarras,
        MostrarStock,
        ValidarStock,
        RequerirCliente,
        IdEmpresa,
        IdUsuarioCreacion
    )
    SELECT
        0, -- BloquearModificacionPrecio: Permitir modificar precios por defecto
        1, -- BloquearModificacionIVA: Bloquear IVA por defecto (usar IVA del producto)
        1, -- BloquearModificacionTotal: Bloquear total por defecto (calcular automáticamente)
        1, -- PermitirDescuentos
        10.00, -- PorcentajeDescuentoMaximo: 10% máximo
        1, -- UsarCodigoBarras
        1, -- MostrarStock
        1, -- ValidarStock
        0, -- RequerirCliente: No requerir cliente por defecto (venta al contado)
        IdEmpresa,
        1 -- IdUsuarioCreacion
    FROM Empresa
    WHERE IdEmpresa NOT IN (SELECT IdEmpresa FROM ConfiguracionPOS WHERE Activo = 1);

    PRINT '✅ Configuración POS por defecto insertada para todas las empresas';
END
ELSE
BEGIN
    -- Si no existe tabla Empresa, crear configuración por defecto con IdEmpresa = 1
    IF NOT EXISTS (SELECT * FROM ConfiguracionPOS WHERE IdEmpresa = 1 AND Activo = 1)
    BEGIN
        INSERT INTO ConfiguracionPOS (
            BloquearModificacionPrecio,
            BloquearModificacionIVA,
            BloquearModificacionTotal,
            PermitirDescuentos,
            PorcentajeDescuentoMaximo,
            UsarCodigoBarras,
            MostrarStock,
            ValidarStock,
            RequerirCliente,
            IdEmpresa,
            IdUsuarioCreacion
        )
        VALUES (
            0, -- BloquearModificacionPrecio
            1, -- BloquearModificacionIVA
            1, -- BloquearModificacionTotal
            1, -- PermitirDescuentos
            10.00, -- PorcentajeDescuentoMaximo
            1, -- UsarCodigoBarras
            1, -- MostrarStock
            1, -- ValidarStock
            0, -- RequerirCliente
            1, -- IdEmpresa
            1  -- IdUsuarioCreacion
        );
        PRINT '✅ Configuración POS por defecto insertada (IdEmpresa = 1)';
    END
END

GO

PRINT '';
PRINT '============================================';
PRINT '✅ Script de configuración POS completado';
PRINT '============================================';
GO

