-- ============================================
-- Triggers para actualización automática de inventario
-- ============================================

USE MiBaseDeContabilidad;
GO

-- ============================================
-- Trigger: Actualizar inventario al crear/actualizar factura
-- ============================================
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'TRG_ActualizarInventario_Factura')
BEGIN
    DROP TRIGGER TRG_ActualizarInventario_Factura;
END
GO

CREATE TRIGGER TRG_ActualizarInventario_Factura
ON DetalleFactura
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @IdProducto INT;
    DECLARE @Cantidad DECIMAL(18, 3);
    DECLARE @IdFactura INT;
    DECLARE @Estado NVARCHAR(20);
    DECLARE @IdUsuario INT;

    -- Procesar inserciones y actualizaciones
    IF EXISTS (SELECT * FROM inserted)
    BEGIN
        DECLARE cur CURSOR FOR
        SELECT i.IdProducto, i.Cantidad, i.IdFactura
        FROM inserted i;

        OPEN cur;
        FETCH NEXT FROM cur INTO @IdProducto, @Cantidad, @IdFactura;

        WHILE @@FETCH_STATUS = 0
        BEGIN
            -- Obtener estado de la factura
            SELECT @Estado = Estado, @IdUsuario = IdUsuarioCreacion
            FROM Facturas
            WHERE IdFactura = @IdFactura;

            -- Solo actualizar si la factura está emitida (no en borrador)
            IF @Estado = 'Emitida'
            BEGIN
                -- Reducir inventario (salida por venta)
                UPDATE Inventario
                SET Cantidad = Cantidad - @Cantidad,
                    FechaUltimaActualizacion = GETDATE()
                WHERE IdProducto = @IdProducto;

                -- Registrar movimiento
                INSERT INTO MovimientosInventario (
                    IdProducto, TipoMovimiento, Cantidad,
                    CantidadAnterior, CantidadNueva,
                    Concepto, Referencia, TipoReferencia, IdUsuario
                )
                SELECT
                    @IdProducto,
                    'Salida',
                    @Cantidad,
                    i.Cantidad + @Cantidad,
                    i.Cantidad,
                    'Venta - Factura ' + CAST(@IdFactura AS NVARCHAR(20)),
                    CAST(@IdFactura AS NVARCHAR(50)),
                    'Factura',
                    @IdUsuario
                FROM Inventario i
                WHERE i.IdProducto = @IdProducto;
            END

            FETCH NEXT FROM cur INTO @IdProducto, @Cantidad, @IdFactura;
        END

        CLOSE cur;
        DEALLOCATE cur;
    END

    -- Procesar eliminaciones (devolver stock)
    IF EXISTS (SELECT * FROM deleted)
    BEGIN
        DECLARE cur2 CURSOR FOR
        SELECT d.IdProducto, d.Cantidad, d.IdFactura
        FROM deleted d
        WHERE NOT EXISTS (SELECT * FROM inserted i WHERE i.IdDetalleFactura = d.IdDetalleFactura);

        OPEN cur2;
        FETCH NEXT FROM cur2 INTO @IdProducto, @Cantidad, @IdFactura;

        WHILE @@FETCH_STATUS = 0
        BEGIN
            SELECT @Estado = Estado, @IdUsuario = IdUsuarioCreacion
            FROM Facturas
            WHERE IdFactura = @IdFactura;

            IF @Estado = 'Emitida'
            BEGIN
                -- Devolver inventario
                UPDATE Inventario
                SET Cantidad = Cantidad + @Cantidad,
                    FechaUltimaActualizacion = GETDATE()
                WHERE IdProducto = @IdProducto;

                -- Registrar movimiento de devolución
                INSERT INTO MovimientosInventario (
                    IdProducto, TipoMovimiento, Cantidad,
                    CantidadAnterior, CantidadNueva,
                    Concepto, Referencia, TipoReferencia, IdUsuario
                )
                SELECT
                    @IdProducto,
                    'Devolucion',
                    @Cantidad,
                    i.Cantidad - @Cantidad,
                    i.Cantidad,
                    'Devolución - Factura ' + CAST(@IdFactura AS NVARCHAR(20)),
                    CAST(@IdFactura AS NVARCHAR(50)),
                    'Factura',
                    @IdUsuario
                FROM Inventario i
                WHERE i.IdProducto = @IdProducto;
            END

            FETCH NEXT FROM cur2 INTO @IdProducto, @Cantidad, @IdFactura;
        END

        CLOSE cur2;
        DEALLOCATE cur2;
    END
END
GO

PRINT '✅ Trigger TRG_ActualizarInventario_Factura creado';
GO

-- ============================================
-- Trigger: Actualizar inventario al crear/actualizar compra
-- ============================================
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'TRG_ActualizarInventario_Compra')
BEGIN
    DROP TRIGGER TRG_ActualizarInventario_Compra;
END
GO

CREATE TRIGGER TRG_ActualizarInventario_Compra
ON DetalleCompra
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @IdProducto INT;
    DECLARE @Cantidad DECIMAL(18, 3);
    DECLARE @IdCompra INT;
    DECLARE @Estado NVARCHAR(20);
    DECLARE @IdUsuario INT;

    -- Procesar inserciones y actualizaciones
    IF EXISTS (SELECT * FROM inserted)
    BEGIN
        DECLARE cur CURSOR FOR
        SELECT i.IdProducto, i.Cantidad, i.IdCompra
        FROM inserted i;

        OPEN cur;
        FETCH NEXT FROM cur INTO @IdProducto, @Cantidad, @IdCompra;

        WHILE @@FETCH_STATUS = 0
        BEGIN
            SELECT @Estado = Estado, @IdUsuario = IdUsuarioCreacion
            FROM Compras
            WHERE IdCompra = @IdCompra;

            -- Solo actualizar si la compra está recibida
            IF @Estado = 'Recibida'
            BEGIN
                -- Aumentar inventario (entrada por compra)
                UPDATE Inventario
                SET Cantidad = Cantidad + @Cantidad,
                    FechaUltimaActualizacion = GETDATE()
                WHERE IdProducto = @IdProducto;

                -- Si no existe registro de inventario, crearlo
                IF @@ROWCOUNT = 0
                BEGIN
                    INSERT INTO Inventario (IdProducto, Cantidad, FechaUltimaActualizacion)
                    VALUES (@IdProducto, @Cantidad, GETDATE());
                END

                -- Registrar movimiento
                INSERT INTO MovimientosInventario (
                    IdProducto, TipoMovimiento, Cantidad,
                    CantidadAnterior, CantidadNueva,
                    Concepto, Referencia, TipoReferencia, IdUsuario
                )
                SELECT
                    @IdProducto,
                    'Entrada',
                    @Cantidad,
                    ISNULL(i.Cantidad - @Cantidad, 0),
                    ISNULL(i.Cantidad, @Cantidad),
                    'Compra - Orden ' + CAST(@IdCompra AS NVARCHAR(20)),
                    CAST(@IdCompra AS NVARCHAR(50)),
                    'Compra',
                    @IdUsuario
                FROM Inventario i
                WHERE i.IdProducto = @IdProducto;
            END

            FETCH NEXT FROM cur INTO @IdProducto, @Cantidad, @IdCompra;
        END

        CLOSE cur;
        DEALLOCATE cur;
    END

    -- Procesar eliminaciones
    IF EXISTS (SELECT * FROM deleted)
    BEGIN
        DECLARE cur2 CURSOR FOR
        SELECT d.IdProducto, d.Cantidad, d.IdCompra
        FROM deleted d
        WHERE NOT EXISTS (SELECT * FROM inserted i WHERE i.IdDetalleCompra = d.IdDetalleCompra);

        OPEN cur2;
        FETCH NEXT FROM cur2 INTO @IdProducto, @Cantidad, @IdCompra;

        WHILE @@FETCH_STATUS = 0
        BEGIN
            SELECT @Estado = Estado, @IdUsuario = IdUsuarioCreacion
            FROM Compras
            WHERE IdCompra = @IdCompra;

            IF @Estado = 'Recibida'
            BEGIN
                -- Reducir inventario
                UPDATE Inventario
                SET Cantidad = Cantidad - @Cantidad,
                    FechaUltimaActualizacion = GETDATE()
                WHERE IdProducto = @IdProducto;

                -- Registrar movimiento
                INSERT INTO MovimientosInventario (
                    IdProducto, TipoMovimiento, Cantidad,
                    CantidadAnterior, CantidadNueva,
                    Concepto, Referencia, TipoReferencia, IdUsuario
                )
                SELECT
                    @IdProducto,
                    'Salida',
                    @Cantidad,
                    i.Cantidad + @Cantidad,
                    i.Cantidad,
                    'Anulación - Compra ' + CAST(@IdCompra AS NVARCHAR(20)),
                    CAST(@IdCompra AS NVARCHAR(50)),
                    'Compra',
                    @IdUsuario
                FROM Inventario i
                WHERE i.IdProducto = @IdProducto;
            END

            FETCH NEXT FROM cur2 INTO @IdProducto, @Cantidad, @IdCompra;
        END

        CLOSE cur2;
        DEALLOCATE cur2;
    END
END
GO

PRINT '✅ Trigger TRG_ActualizarInventario_Compra creado';
GO

PRINT '';
PRINT '═══════════════════════════════════════════════════';
PRINT '✅ TRIGGERS DE INVENTARIO CREADOS';
PRINT '═══════════════════════════════════════════════════';
PRINT '';


