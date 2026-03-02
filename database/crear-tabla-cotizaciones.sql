-- ============================================
-- Tabla: Cotizaciones
-- ============================================
USE MiBaseDeContabilidad;
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Cotizaciones]') AND type in (N'U'))
BEGIN
    CREATE TABLE Cotizaciones (
        IdCotizacion INT IDENTITY(1,1) PRIMARY KEY,
        NumeroCotizacion NVARCHAR(20) NOT NULL UNIQUE,
        Fecha DATE NOT NULL,
        FechaVencimiento DATE NULL,
        IdCliente INT NOT NULL,
        IdVendedor INT NULL,
        IdEmpresa INT NULL,
        Subtotal DECIMAL(18, 2) NOT NULL DEFAULT 0,
        IVA DECIMAL(18, 2) NOT NULL DEFAULT 0,
        Total DECIMAL(18, 2) NOT NULL DEFAULT 0,
        Estado NVARCHAR(20) NOT NULL DEFAULT 'Borrador' CHECK (Estado IN ('Borrador', 'Enviada', 'Aceptada', 'Rechazada', 'Convertida')),
        Observaciones NVARCHAR(500) NULL,
        IdUsuarioCreacion INT NOT NULL,
        IdFacturaGenerada INT NULL, -- Si se convierte a factura
        FechaCreacion DATETIME DEFAULT GETDATE(),
        FechaModificacion DATETIME NULL,
        FOREIGN KEY (IdCliente) REFERENCES Clientes(IdCliente),
        FOREIGN KEY (IdVendedor) REFERENCES Vendedores(IdVendedor),
        FOREIGN KEY (IdEmpresa) REFERENCES Empresa(IdEmpresa),
        FOREIGN KEY (IdUsuarioCreacion) REFERENCES Usuarios(IdUsuario),
        FOREIGN KEY (IdFacturaGenerada) REFERENCES Facturas(IdFactura)
    );
    PRINT '✅ Tabla Cotizaciones creada exitosamente';
END
ELSE
BEGIN
    PRINT '⚠️  La tabla Cotizaciones ya existe';
END
GO

-- ============================================
-- Tabla: DetalleCotizacion
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[DetalleCotizacion]') AND type in (N'U'))
BEGIN
    CREATE TABLE DetalleCotizacion (
        IdDetalleCotizacion INT IDENTITY(1,1) PRIMARY KEY,
        IdCotizacion INT NOT NULL,
        IdProducto INT NOT NULL,
        Cantidad DECIMAL(18, 3) NOT NULL,
        PrecioUnitario DECIMAL(18, 2) NOT NULL,
        Descuento DECIMAL(18, 2) NOT NULL DEFAULT 0,
        IVA DECIMAL(5, 2) NOT NULL DEFAULT 0,
        Subtotal DECIMAL(18, 2) NOT NULL,
        Total DECIMAL(18, 2) NOT NULL,
        FOREIGN KEY (IdCotizacion) REFERENCES Cotizaciones(IdCotizacion) ON DELETE CASCADE,
        FOREIGN KEY (IdProducto) REFERENCES Productos(IdProducto)
    );
    PRINT '✅ Tabla DetalleCotizacion creada exitosamente';
END
ELSE
BEGIN
    PRINT '⚠️  La tabla DetalleCotizacion ya existe';
END
GO

-- ============================================
-- Tabla: OrdenesCompra
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[OrdenesCompra]') AND type in (N'U'))
BEGIN
    CREATE TABLE OrdenesCompra (
        IdOrdenCompra INT IDENTITY(1,1) PRIMARY KEY,
        NumeroOrden NVARCHAR(20) NOT NULL UNIQUE,
        Fecha DATE NOT NULL,
        FechaEntregaEsperada DATE NULL,
        IdProveedor INT NOT NULL,
        IdEmpresa INT NULL,
        Subtotal DECIMAL(18, 2) NOT NULL DEFAULT 0,
        IVA DECIMAL(18, 2) NOT NULL DEFAULT 0,
        Total DECIMAL(18, 2) NOT NULL DEFAULT 0,
        Estado NVARCHAR(20) NOT NULL DEFAULT 'Borrador' CHECK (Estado IN ('Borrador', 'Enviada', 'Aceptada', 'Rechazada', 'Convertida')),
        Observaciones NVARCHAR(500) NULL,
        IdUsuarioCreacion INT NOT NULL,
        IdCompraGenerada INT NULL, -- Si se convierte a compra
        FechaCreacion DATETIME DEFAULT GETDATE(),
        FechaModificacion DATETIME NULL,
        FOREIGN KEY (IdProveedor) REFERENCES Proveedores(IdProveedor),
        FOREIGN KEY (IdEmpresa) REFERENCES Empresa(IdEmpresa),
        FOREIGN KEY (IdUsuarioCreacion) REFERENCES Usuarios(IdUsuario),
        FOREIGN KEY (IdCompraGenerada) REFERENCES Compras(IdCompra)
    );
    PRINT '✅ Tabla OrdenesCompra creada exitosamente';
END
ELSE
BEGIN
    PRINT '⚠️  La tabla OrdenesCompra ya existe';
END
GO

-- ============================================
-- Tabla: DetalleOrdenCompra
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[DetalleOrdenCompra]') AND type in (N'U'))
BEGIN
    CREATE TABLE DetalleOrdenCompra (
        IdDetalleOrdenCompra INT IDENTITY(1,1) PRIMARY KEY,
        IdOrdenCompra INT NOT NULL,
        IdProducto INT NOT NULL,
        Cantidad DECIMAL(18, 3) NOT NULL,
        PrecioUnitario DECIMAL(18, 2) NOT NULL,
        Descuento DECIMAL(18, 2) NOT NULL DEFAULT 0,
        IVA DECIMAL(5, 2) NOT NULL DEFAULT 0,
        Subtotal DECIMAL(18, 2) NOT NULL,
        Total DECIMAL(18, 2) NOT NULL,
        FOREIGN KEY (IdOrdenCompra) REFERENCES OrdenesCompra(IdOrdenCompra) ON DELETE CASCADE,
        FOREIGN KEY (IdProducto) REFERENCES Productos(IdProducto)
    );
    PRINT '✅ Tabla DetalleOrdenCompra creada exitosamente';
END
ELSE
BEGIN
    PRINT '⚠️  La tabla DetalleOrdenCompra ya existe';
END
GO

-- Crear índices para mejorar rendimiento
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Cotizaciones_Numero' AND object_id = OBJECT_ID('Cotizaciones'))
BEGIN
    CREATE INDEX IX_Cotizaciones_Numero ON Cotizaciones(NumeroCotizacion);
    PRINT '✅ Índice IX_Cotizaciones_Numero creado';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_OrdenesCompra_Numero' AND object_id = OBJECT_ID('OrdenesCompra'))
BEGIN
    CREATE INDEX IX_OrdenesCompra_Numero ON OrdenesCompra(NumeroOrden);
    PRINT '✅ Índice IX_OrdenesCompra_Numero creado';
END
GO

PRINT '';
PRINT '═══════════════════════════════════════════════════';
PRINT '✅ Script de Cotizaciones y Órdenes de Compra ejecutado correctamente';
PRINT '═══════════════════════════════════════════════════';
GO

