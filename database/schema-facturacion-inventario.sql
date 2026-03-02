-- ============================================
-- Script de creación de tablas adicionales
-- Facturación, Compras e Inventario
-- ============================================

USE MiBaseDeContabilidad;
GO

-- ============================================
-- Tabla: Productos
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Productos]') AND type in (N'U'))
BEGIN
    CREATE TABLE Productos (
        IdProducto INT IDENTITY(1,1) PRIMARY KEY,
        Codigo NVARCHAR(50) NOT NULL UNIQUE,
        Nombre NVARCHAR(200) NOT NULL,
        Descripcion NVARCHAR(500),
        UnidadMedida NVARCHAR(20) NOT NULL DEFAULT 'UN', -- UN=Unidad, KG=Kilogramo, etc.
        PrecioVenta DECIMAL(18, 2) NOT NULL DEFAULT 0,
        PrecioCompra DECIMAL(18, 2) NOT NULL DEFAULT 0,
        IVA DECIMAL(5, 2) NOT NULL DEFAULT 0, -- Porcentaje de IVA (19% en Colombia)
        Activo BIT NOT NULL DEFAULT 1,
        FechaCreacion DATETIME DEFAULT GETDATE(),
        FechaModificacion DATETIME DEFAULT GETDATE()
    );
    PRINT '✅ Tabla Productos creada exitosamente';
END
ELSE
BEGIN
    PRINT '⚠️  La tabla Productos ya existe';
END
GO

-- ============================================
-- Tabla: Inventario
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Inventario]') AND type in (N'U'))
BEGIN
    CREATE TABLE Inventario (
        IdInventario INT IDENTITY(1,1) PRIMARY KEY,
        IdProducto INT NOT NULL,
        Cantidad DECIMAL(18, 3) NOT NULL DEFAULT 0,
        CantidadMinima DECIMAL(18, 3) NOT NULL DEFAULT 0, -- Stock mínimo
        CantidadMaxima DECIMAL(18, 3) NULL, -- Stock máximo
        Ubicacion NVARCHAR(100), -- Ubicación física en almacén
        FechaUltimaActualizacion DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (IdProducto) REFERENCES Productos(IdProducto),
        UNIQUE (IdProducto) -- Un registro de inventario por producto
    );
    PRINT '✅ Tabla Inventario creada exitosamente';
END
ELSE
BEGIN
    PRINT '⚠️  La tabla Inventario ya existe';
END
GO

-- ============================================
-- Tabla: Facturas (Ventas)
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Facturas]') AND type in (N'U'))
BEGIN
    CREATE TABLE Facturas (
        IdFactura INT IDENTITY(1,1) PRIMARY KEY,
        NumeroFactura NVARCHAR(20) NOT NULL UNIQUE,
        Fecha DATE NOT NULL,
        IdCliente INT NOT NULL,
        Subtotal DECIMAL(18, 2) NOT NULL DEFAULT 0,
        IVA DECIMAL(18, 2) NOT NULL DEFAULT 0,
        Total DECIMAL(18, 2) NOT NULL DEFAULT 0,
        Estado NVARCHAR(20) NOT NULL DEFAULT 'Borrador' CHECK (Estado IN ('Borrador', 'Emitida', 'Anulada')),
        Observaciones NVARCHAR(500),
        IdUsuarioCreacion INT NOT NULL,
        FechaCreacion DATETIME DEFAULT GETDATE(),
        FechaModificacion DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (IdCliente) REFERENCES Terceros(IdTercero),
        FOREIGN KEY (IdUsuarioCreacion) REFERENCES Usuarios(IdUsuario)
    );
    PRINT '✅ Tabla Facturas creada exitosamente';
END
ELSE
BEGIN
    PRINT '⚠️  La tabla Facturas ya existe';
END
GO

-- ============================================
-- Tabla: DetalleFactura
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[DetalleFactura]') AND type in (N'U'))
BEGIN
    CREATE TABLE DetalleFactura (
        IdDetalleFactura INT IDENTITY(1,1) PRIMARY KEY,
        IdFactura INT NOT NULL,
        IdProducto INT NOT NULL,
        Cantidad DECIMAL(18, 3) NOT NULL,
        PrecioUnitario DECIMAL(18, 2) NOT NULL,
        Descuento DECIMAL(18, 2) NOT NULL DEFAULT 0,
        IVA DECIMAL(5, 2) NOT NULL DEFAULT 0,
        Subtotal DECIMAL(18, 2) NOT NULL,
        Total DECIMAL(18, 2) NOT NULL,
        FOREIGN KEY (IdFactura) REFERENCES Facturas(IdFactura) ON DELETE CASCADE,
        FOREIGN KEY (IdProducto) REFERENCES Productos(IdProducto)
    );
    PRINT '✅ Tabla DetalleFactura creada exitosamente';
END
ELSE
BEGIN
    PRINT '⚠️  La tabla DetalleFactura ya existe';
END
GO

-- ============================================
-- Tabla: Compras
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Compras]') AND type in (N'U'))
BEGIN
    CREATE TABLE Compras (
        IdCompra INT IDENTITY(1,1) PRIMARY KEY,
        NumeroFactura NVARCHAR(50), -- Número de factura del proveedor
        Fecha DATE NOT NULL,
        IdProveedor INT NOT NULL,
        Subtotal DECIMAL(18, 2) NOT NULL DEFAULT 0,
        IVA DECIMAL(18, 2) NOT NULL DEFAULT 0,
        Total DECIMAL(18, 2) NOT NULL DEFAULT 0,
        Estado NVARCHAR(20) NOT NULL DEFAULT 'Borrador' CHECK (Estado IN ('Borrador', 'Recibida', 'Anulada')),
        Observaciones NVARCHAR(500),
        IdUsuarioCreacion INT NOT NULL,
        FechaCreacion DATETIME DEFAULT GETDATE(),
        FechaModificacion DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (IdProveedor) REFERENCES Terceros(IdTercero),
        FOREIGN KEY (IdUsuarioCreacion) REFERENCES Usuarios(IdUsuario)
    );
    PRINT '✅ Tabla Compras creada exitosamente';
END
ELSE
BEGIN
    PRINT '⚠️  La tabla Compras ya existe';
END
GO

-- ============================================
-- Tabla: DetalleCompra
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[DetalleCompra]') AND type in (N'U'))
BEGIN
    CREATE TABLE DetalleCompra (
        IdDetalleCompra INT IDENTITY(1,1) PRIMARY KEY,
        IdCompra INT NOT NULL,
        IdProducto INT NOT NULL,
        Cantidad DECIMAL(18, 3) NOT NULL,
        PrecioUnitario DECIMAL(18, 2) NOT NULL,
        Descuento DECIMAL(18, 2) NOT NULL DEFAULT 0,
        IVA DECIMAL(5, 2) NOT NULL DEFAULT 0,
        Subtotal DECIMAL(18, 2) NOT NULL,
        Total DECIMAL(18, 2) NOT NULL,
        FOREIGN KEY (IdCompra) REFERENCES Compras(IdCompra) ON DELETE CASCADE,
        FOREIGN KEY (IdProducto) REFERENCES Productos(IdProducto)
    );
    PRINT '✅ Tabla DetalleCompra creada exitosamente';
END
ELSE
BEGIN
    PRINT '⚠️  La tabla DetalleCompra ya existe';
END
GO

-- ============================================
-- Tabla: MovimientosInventario
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[MovimientosInventario]') AND type in (N'U'))
BEGIN
    CREATE TABLE MovimientosInventario (
        IdMovimiento INT IDENTITY(1,1) PRIMARY KEY,
        IdProducto INT NOT NULL,
        TipoMovimiento NVARCHAR(20) NOT NULL CHECK (TipoMovimiento IN ('Entrada', 'Salida', 'Ajuste', 'Devolucion')),
        Cantidad DECIMAL(18, 3) NOT NULL,
        CantidadAnterior DECIMAL(18, 3) NOT NULL,
        CantidadNueva DECIMAL(18, 3) NOT NULL,
        Concepto NVARCHAR(200) NOT NULL,
        Referencia NVARCHAR(50), -- Puede ser IdFactura, IdCompra, etc.
        TipoReferencia NVARCHAR(20), -- 'Factura', 'Compra', 'Ajuste', etc.
        FechaMovimiento DATETIME DEFAULT GETDATE(),
        IdUsuario INT NOT NULL,
        FOREIGN KEY (IdProducto) REFERENCES Productos(IdProducto),
        FOREIGN KEY (IdUsuario) REFERENCES Usuarios(IdUsuario)
    );
    PRINT '✅ Tabla MovimientosInventario creada exitosamente';
END
ELSE
BEGIN
    PRINT '⚠️  La tabla MovimientosInventario ya existe';
END
GO

-- ============================================
-- Índices para mejorar el rendimiento
-- ============================================

-- Índices en Productos
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Productos_Codigo')
BEGIN
    CREATE INDEX IX_Productos_Codigo ON Productos(Codigo);
    PRINT '✅ Índice IX_Productos_Codigo creado';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Productos_Activo')
BEGIN
    CREATE INDEX IX_Productos_Activo ON Productos(Activo);
    PRINT '✅ Índice IX_Productos_Activo creado';
END
GO

-- Índices en Facturas
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Facturas_NumeroFactura')
BEGIN
    CREATE INDEX IX_Facturas_NumeroFactura ON Facturas(NumeroFactura);
    PRINT '✅ Índice IX_Facturas_NumeroFactura creado';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Facturas_Fecha')
BEGIN
    CREATE INDEX IX_Facturas_Fecha ON Facturas(Fecha);
    PRINT '✅ Índice IX_Facturas_Fecha creado';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Facturas_IdCliente')
BEGIN
    CREATE INDEX IX_Facturas_IdCliente ON Facturas(IdCliente);
    PRINT '✅ Índice IX_Facturas_IdCliente creado';
END
GO

-- Índices en Compras
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Compras_Fecha')
BEGIN
    CREATE INDEX IX_Compras_Fecha ON Compras(Fecha);
    PRINT '✅ Índice IX_Compras_Fecha creado';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Compras_IdProveedor')
BEGIN
    CREATE INDEX IX_Compras_IdProveedor ON Compras(IdProveedor);
    PRINT '✅ Índice IX_Compras_IdProveedor creado';
END
GO

-- Índices en MovimientosInventario
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_MovimientosInventario_IdProducto')
BEGIN
    CREATE INDEX IX_MovimientosInventario_IdProducto ON MovimientosInventario(IdProducto);
    PRINT '✅ Índice IX_MovimientosInventario_IdProducto creado';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_MovimientosInventario_Fecha')
BEGIN
    CREATE INDEX IX_MovimientosInventario_Fecha ON MovimientosInventario(FechaMovimiento);
    PRINT '✅ Índice IX_MovimientosInventario_Fecha creado';
END
GO

PRINT '';
PRINT '═══════════════════════════════════════════════════';
PRINT '✅ TABLAS DE FACTURACIÓN E INVENTARIO CREADAS';
PRINT '═══════════════════════════════════════════════════';
PRINT '';
PRINT 'Tablas creadas:';
PRINT '  - Productos';
PRINT '  - Inventario';
PRINT '  - Facturas';
PRINT '  - DetalleFactura';
PRINT '  - Compras';
PRINT '  - DetalleCompra';
PRINT '  - MovimientosInventario';
PRINT '';


