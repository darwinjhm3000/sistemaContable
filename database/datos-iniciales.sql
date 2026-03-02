-- ============================================
-- Script de Datos Iniciales
-- Sistema Contable - Colombia
-- ============================================

USE MiBaseDeContabilidad;
GO

-- ============================================
-- Insertar Usuarios de Prueba
-- ============================================
PRINT 'Insertando usuarios...';

-- Usuario administrador por defecto
IF NOT EXISTS (SELECT * FROM Usuarios WHERE Usuario = 'admin')
BEGIN
    INSERT INTO Usuarios (Usuario, Contraseña, Nombre, Email, Activo)
    VALUES ('admin', 'admin123', 'Administrador del Sistema', 'admin@sistema.com', 1);
    PRINT '✅ Usuario admin creado (Usuario: admin, Contraseña: admin123)';
END
ELSE
BEGIN
    PRINT '⚠️  El usuario admin ya existe';
END

IF NOT EXISTS (SELECT * FROM Usuarios WHERE Usuario = 'contador')
BEGIN
    INSERT INTO Usuarios (Usuario, Contraseña, Nombre, Email, Activo)
    VALUES ('contador', 'contador123', 'Contador General', 'contador@sistema.com', 1);
    PRINT '✅ Usuario contador creado (Usuario: contador, Contraseña: contador123)';
END
GO

-- ============================================
-- Insertar Cuentas del PUC (Plan Único de Cuentas) - Estructura Básica Colombia
-- ============================================
PRINT '';
PRINT 'Insertando cuentas del PUC...';

-- Clase 1: Activos
INSERT INTO CuentasPUC (CodigoCuenta, NombreCuenta, Naturaleza, Nivel, CodigoPadre, Activa)
SELECT '1', 'ACTIVO', 'D', 1, NULL, 1
WHERE NOT EXISTS (SELECT * FROM CuentasPUC WHERE CodigoCuenta = '1');

INSERT INTO CuentasPUC (CodigoCuenta, NombreCuenta, Naturaleza, Nivel, CodigoPadre, Activa)
SELECT '11', 'DISPONIBLE', 'D', 2, '1', 1
WHERE NOT EXISTS (SELECT * FROM CuentasPUC WHERE CodigoCuenta = '11');

INSERT INTO CuentasPUC (CodigoCuenta, NombreCuenta, Naturaleza, Nivel, CodigoPadre, Activa)
SELECT '1105', 'CAJA', 'D', 3, '11', 1
WHERE NOT EXISTS (SELECT * FROM CuentasPUC WHERE CodigoCuenta = '1105');

INSERT INTO CuentasPUC (CodigoCuenta, NombreCuenta, Naturaleza, Nivel, CodigoPadre, Activa)
SELECT '110505', 'CAJA GENERAL', 'D', 4, '1105', 1
WHERE NOT EXISTS (SELECT * FROM CuentasPUC WHERE CodigoCuenta = '110505');

INSERT INTO CuentasPUC (CodigoCuenta, NombreCuenta, Naturaleza, Nivel, CodigoPadre, Activa)
SELECT '1110', 'BANCOS', 'D', 3, '11', 1
WHERE NOT EXISTS (SELECT * FROM CuentasPUC WHERE CodigoCuenta = '1110');

INSERT INTO CuentasPUC (CodigoCuenta, NombreCuenta, Naturaleza, Nivel, CodigoPadre, Activa)
SELECT '111005', 'CUENTA CORRIENTE', 'D', 4, '1110', 1
WHERE NOT EXISTS (SELECT * FROM CuentasPUC WHERE CodigoCuenta = '111005');

INSERT INTO CuentasPUC (CodigoCuenta, NombreCuenta, Naturaleza, Nivel, CodigoPadre, Activa)
SELECT '13', 'DEUDORES', 'D', 2, '1', 1
WHERE NOT EXISTS (SELECT * FROM CuentasPUC WHERE CodigoCuenta = '13');

INSERT INTO CuentasPUC (CodigoCuenta, NombreCuenta, Naturaleza, Nivel, CodigoPadre, Activa)
SELECT '1305', 'CLIENTES', 'D', 3, '13', 1
WHERE NOT EXISTS (SELECT * FROM CuentasPUC WHERE CodigoCuenta = '1305');

INSERT INTO CuentasPUC (CodigoCuenta, NombreCuenta, Naturaleza, Nivel, CodigoPadre, Activa)
SELECT '130505', 'CLIENTES NACIONALES', 'D', 4, '1305', 1
WHERE NOT EXISTS (SELECT * FROM CuentasPUC WHERE CodigoCuenta = '130505');

-- Clase 2: Pasivos
INSERT INTO CuentasPUC (CodigoCuenta, NombreCuenta, Naturaleza, Nivel, CodigoPadre, Activa)
SELECT '2', 'PASIVO', 'C', 1, NULL, 1
WHERE NOT EXISTS (SELECT * FROM CuentasPUC WHERE CodigoCuenta = '2');

INSERT INTO CuentasPUC (CodigoCuenta, NombreCuenta, Naturaleza, Nivel, CodigoPadre, Activa)
SELECT '21', 'OBLIGACIONES FINANCIERAS', 'C', 2, '2', 1
WHERE NOT EXISTS (SELECT * FROM CuentasPUC WHERE CodigoCuenta = '21');

INSERT INTO CuentasPUC (CodigoCuenta, NombreCuenta, Naturaleza, Nivel, CodigoPadre, Activa)
SELECT '2105', 'BANCOS NACIONALES', 'C', 3, '21', 1
WHERE NOT EXISTS (SELECT * FROM CuentasPUC WHERE CodigoCuenta = '2105');

INSERT INTO CuentasPUC (CodigoCuenta, NombreCuenta, Naturaleza, Nivel, CodigoPadre, Activa)
SELECT '22', 'PROVEEDORES', 'C', 2, '2', 1
WHERE NOT EXISTS (SELECT * FROM CuentasPUC WHERE CodigoCuenta = '22');

INSERT INTO CuentasPUC (CodigoCuenta, NombreCuenta, Naturaleza, Nivel, CodigoPadre, Activa)
SELECT '2205', 'PROVEEDORES NACIONALES', 'C', 3, '22', 1
WHERE NOT EXISTS (SELECT * FROM CuentasPUC WHERE CodigoCuenta = '2205');

-- Clase 3: Patrimonio
INSERT INTO CuentasPUC (CodigoCuenta, NombreCuenta, Naturaleza, Nivel, CodigoPadre, Activa)
SELECT '3', 'PATRIMONIO', 'C', 1, NULL, 1
WHERE NOT EXISTS (SELECT * FROM CuentasPUC WHERE CodigoCuenta = '3');

INSERT INTO CuentasPUC (CodigoCuenta, NombreCuenta, Naturaleza, Nivel, CodigoPadre, Activa)
SELECT '31', 'CAPITAL', 'C', 2, '3', 1
WHERE NOT EXISTS (SELECT * FROM CuentasPUC WHERE CodigoCuenta = '31');

INSERT INTO CuentasPUC (CodigoCuenta, NombreCuenta, Naturaleza, Nivel, CodigoPadre, Activa)
SELECT '3105', 'CAPITAL SOCIAL', 'C', 3, '31', 1
WHERE NOT EXISTS (SELECT * FROM CuentasPUC WHERE CodigoCuenta = '3105');

-- Clase 4: Ingresos
INSERT INTO CuentasPUC (CodigoCuenta, NombreCuenta, Naturaleza, Nivel, CodigoPadre, Activa)
SELECT '4', 'INGRESOS', 'C', 1, NULL, 1
WHERE NOT EXISTS (SELECT * FROM CuentasPUC WHERE CodigoCuenta = '4');

INSERT INTO CuentasPUC (CodigoCuenta, NombreCuenta, Naturaleza, Nivel, CodigoPadre, Activa)
SELECT '41', 'OPERACIONALES', 'C', 2, '4', 1
WHERE NOT EXISTS (SELECT * FROM CuentasPUC WHERE CodigoCuenta = '41');

INSERT INTO CuentasPUC (CodigoCuenta, NombreCuenta, Naturaleza, Nivel, CodigoPadre, Activa)
SELECT '4135', 'COMERCIO AL POR MAYOR Y AL POR MENOR', 'C', 3, '41', 1
WHERE NOT EXISTS (SELECT * FROM CuentasPUC WHERE CodigoCuenta = '4135');

INSERT INTO CuentasPUC (CodigoCuenta, NombreCuenta, Naturaleza, Nivel, CodigoPadre, Activa)
SELECT '413505', 'VENTA DE MERCANCÍAS', 'C', 4, '4135', 1
WHERE NOT EXISTS (SELECT * FROM CuentasPUC WHERE CodigoCuenta = '413505');

-- Clase 5: Gastos
INSERT INTO CuentasPUC (CodigoCuenta, NombreCuenta, Naturaleza, Nivel, CodigoPadre, Activa)
SELECT '5', 'GASTOS', 'D', 1, NULL, 1
WHERE NOT EXISTS (SELECT * FROM CuentasPUC WHERE CodigoCuenta = '5');

INSERT INTO CuentasPUC (CodigoCuenta, NombreCuenta, Naturaleza, Nivel, CodigoPadre, Activa)
SELECT '51', 'OPERACIONALES DE ADMINISTRACION', 'D', 2, '5', 1
WHERE NOT EXISTS (SELECT * FROM CuentasPUC WHERE CodigoCuenta = '51');

INSERT INTO CuentasPUC (CodigoCuenta, NombreCuenta, Naturaleza, Nivel, CodigoPadre, Activa)
SELECT '5105', 'GASTOS DE PERSONAL', 'D', 3, '51', 1
WHERE NOT EXISTS (SELECT * FROM CuentasPUC WHERE CodigoCuenta = '5105');

INSERT INTO CuentasPUC (CodigoCuenta, NombreCuenta, Naturaleza, Nivel, CodigoPadre, Activa)
SELECT '510515', 'SUELDOS', 'D', 4, '5105', 1
WHERE NOT EXISTS (SELECT * FROM CuentasPUC WHERE CodigoCuenta = '510515');

PRINT '✅ Cuentas del PUC insertadas';
GO

-- ============================================
-- Insertar Terceros de Prueba
-- ============================================
PRINT '';
PRINT 'Insertando terceros...';

IF NOT EXISTS (SELECT * FROM Terceros WHERE NIT = '900123456-7')
BEGIN
    INSERT INTO Terceros (NIT, NombreRazonSocial, Direccion, Tipo, Activo)
    VALUES ('900123456-7', 'Cliente Ejemplo S.A.S', 'Calle 123 #45-67', 'C', 1);
    PRINT '✅ Tercero Cliente Ejemplo S.A.S creado';
END

IF NOT EXISTS (SELECT * FROM Terceros WHERE NIT = '800987654-3')
BEGIN
    INSERT INTO Terceros (NIT, NombreRazonSocial, Direccion, Tipo, Activo)
    VALUES ('800987654-3', 'Proveedor ABC Ltda.', 'Avenida 100 #20-30', 'P', 1);
    PRINT '✅ Tercero Proveedor ABC Ltda. creado';
END
GO

PRINT '';
PRINT '═══════════════════════════════════════════════════';
PRINT '✅ DATOS INICIALES INSERTADOS EXITOSAMENTE';
PRINT '═══════════════════════════════════════════════════';
PRINT '';
PRINT 'Usuarios de prueba:';
PRINT '  - admin / admin123';
PRINT '  - contador / contador123';
PRINT '';
PRINT 'El sistema está listo para usar.';
PRINT '';


