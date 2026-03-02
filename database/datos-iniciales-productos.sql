-- ============================================
-- Datos iniciales: Productos de ejemplo
-- ============================================

USE MiBaseDeContabilidad;
GO

PRINT 'Insertando productos de ejemplo...';

-- Producto 1
IF NOT EXISTS (SELECT * FROM Productos WHERE Codigo = 'PROD001')
BEGIN
    INSERT INTO Productos (Codigo, Nombre, Descripcion, UnidadMedida, PrecioVenta, PrecioCompra, IVA, Activo)
    VALUES ('PROD001', 'Laptop Dell Inspiron 15', 'Laptop 15 pulgadas, 8GB RAM, 256GB SSD', 'UN', 2500000, 2000000, 19, 1);

    INSERT INTO Inventario (IdProducto, Cantidad, CantidadMinima, CantidadMaxima)
    SELECT IdProducto, 10, 5, 50
    FROM Productos WHERE Codigo = 'PROD001';

    PRINT '✅ Producto PROD001 creado';
END

-- Producto 2
IF NOT EXISTS (SELECT * FROM Productos WHERE Codigo = 'PROD002')
BEGIN
    INSERT INTO Productos (Codigo, Nombre, Descripcion, UnidadMedida, PrecioVenta, PrecioCompra, IVA, Activo)
    VALUES ('PROD002', 'Mouse Inalámbrico Logitech', 'Mouse inalámbrico con sensor óptico', 'UN', 85000, 60000, 19, 1);

    INSERT INTO Inventario (IdProducto, Cantidad, CantidadMinima, CantidadMaxima)
    SELECT IdProducto, 50, 20, 200
    FROM Productos WHERE Codigo = 'PROD002';

    PRINT '✅ Producto PROD002 creado';
END

-- Producto 3
IF NOT EXISTS (SELECT * FROM Productos WHERE Codigo = 'PROD003')
BEGIN
    INSERT INTO Productos (Codigo, Nombre, Descripcion, UnidadMedida, PrecioVenta, PrecioCompra, IVA, Activo)
    VALUES ('PROD003', 'Teclado Mecánico RGB', 'Teclado mecánico con retroiluminación RGB', 'UN', 350000, 280000, 19, 1);

    INSERT INTO Inventario (IdProducto, Cantidad, CantidadMinima, CantidadMaxima)
    SELECT IdProducto, 30, 10, 100
    FROM Productos WHERE Codigo = 'PROD003';

    PRINT '✅ Producto PROD003 creado';
END

-- Producto 4
IF NOT EXISTS (SELECT * FROM Productos WHERE Codigo = 'PROD004')
BEGIN
    INSERT INTO Productos (Codigo, Nombre, Descripcion, UnidadMedida, PrecioVenta, PrecioCompra, IVA, Activo)
    VALUES ('PROD004', 'Monitor 24 pulgadas Full HD', 'Monitor LED 24 pulgadas, resolución 1920x1080', 'UN', 650000, 520000, 19, 1);

    INSERT INTO Inventario (IdProducto, Cantidad, CantidadMinima, CantidadMaxima)
    SELECT IdProducto, 15, 5, 50
    FROM Productos WHERE Codigo = 'PROD004';

    PRINT '✅ Producto PROD004 creado';
END

-- Producto 5
IF NOT EXISTS (SELECT * FROM Productos WHERE Codigo = 'PROD005')
BEGIN
    INSERT INTO Productos (Codigo, Nombre, Descripcion, UnidadMedida, PrecioVenta, PrecioCompra, IVA, Activo)
    VALUES ('PROD005', 'Cable HDMI 2 metros', 'Cable HDMI de alta velocidad, 2 metros', 'UN', 25000, 15000, 19, 1);

    INSERT INTO Inventario (IdProducto, Cantidad, CantidadMinima, CantidadMaxima)
    SELECT IdProducto, 100, 30, 500
    FROM Productos WHERE Codigo = 'PROD005';

    PRINT '✅ Producto PROD005 creado';
END

PRINT '';
PRINT '═══════════════════════════════════════════════════';
PRINT '✅ PRODUCTOS DE EJEMPLO INSERTADOS';
PRINT '═══════════════════════════════════════════════════';
PRINT '';


