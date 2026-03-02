-- ============================================
-- Script para crear usuario SQL con autenticación SQL
-- Para desarrollo local
-- ============================================

USE master;
GO

-- Crear login SQL Server
IF NOT EXISTS (SELECT * FROM sys.server_principals WHERE name = 'sistema_contable')
BEGIN
    CREATE LOGIN sistema_contable
    WITH PASSWORD = 'SistemaContable2024!',
         DEFAULT_DATABASE = MiBaseDeContabilidad,
         CHECK_EXPIRATION = OFF,
         CHECK_POLICY = OFF;
    PRINT '✅ Login sistema_contable creado';
END
ELSE
BEGIN
    PRINT '⚠️  El login sistema_contable ya existe';
END
GO

-- Asignar permisos al usuario en la base de datos
USE MiBaseDeContabilidad;
GO

IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = 'sistema_contable')
BEGIN
    CREATE USER sistema_contable FOR LOGIN sistema_contable;
    PRINT '✅ Usuario sistema_contable creado en la base de datos';
END
ELSE
BEGIN
    PRINT '⚠️  El usuario sistema_contable ya existe en la base de datos';
END
GO

-- Asignar roles necesarios
ALTER ROLE db_datareader ADD MEMBER sistema_contable;
ALTER ROLE db_datawriter ADD MEMBER sistema_contable;
ALTER ROLE db_ddladmin ADD MEMBER sistema_contable;
PRINT '✅ Permisos asignados al usuario sistema_contable';
GO

PRINT '';
PRINT '═══════════════════════════════════════════════════';
PRINT '✅ USUARIO SQL CREADO EXITOSAMENTE';
PRINT '═══════════════════════════════════════════════════';
PRINT '';
PRINT 'Credenciales:';
PRINT '  Usuario: sistema_contable';
PRINT '  Contraseña: SistemaContable2024!';
PRINT '';
PRINT 'Actualiza la configuración del backend para usar estas credenciales.';
PRINT '';


