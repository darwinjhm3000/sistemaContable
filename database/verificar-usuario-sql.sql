-- ============================================
-- Script para verificar el usuario SQL creado
-- ============================================

USE master;
GO

PRINT '═══════════════════════════════════════════════════';
PRINT 'Verificando Login de sistema_contable';
PRINT '═══════════════════════════════════════════════════';
PRINT '';

-- Verificar si el login existe
IF EXISTS (SELECT * FROM sys.server_principals WHERE name = 'sistema_contable')
BEGIN
    SELECT
        name AS 'Login',
        type_desc AS 'Tipo',
        create_date AS 'Fecha Creación',
        default_database_name AS 'Base de Datos por Defecto',
        is_disabled AS 'Deshabilitado'
    FROM sys.server_principals
    WHERE name = 'sistema_contable';

    PRINT '✅ Login sistema_contable encontrado';
END
ELSE
BEGIN
    PRINT '❌ Login sistema_contable NO encontrado';
    PRINT '   Ejecuta: database/crear-usuario-sql.sql';
END
GO

USE MiBaseDeContabilidad;
GO

PRINT '';
PRINT '═══════════════════════════════════════════════════';
PRINT 'Verificando Usuario en la base de datos';
PRINT '═══════════════════════════════════════════════════';
PRINT '';

-- Verificar si el usuario existe en la base de datos
IF EXISTS (SELECT * FROM sys.database_principals WHERE name = 'sistema_contable')
BEGIN
    SELECT
        name AS 'Usuario',
        type_desc AS 'Tipo',
        create_date AS 'Fecha Creación'
    FROM sys.database_principals
    WHERE name = 'sistema_contable';

    PRINT '✅ Usuario sistema_contable encontrado en la base de datos';

    -- Verificar roles asignados
    PRINT '';
    PRINT 'Roles asignados:';
    SELECT
        r.name AS 'Rol'
    FROM sys.database_role_members rm
    INNER JOIN sys.database_principals r ON rm.role_principal_id = r.principal_id
    INNER JOIN sys.database_principals m ON rm.member_principal_id = m.principal_id
    WHERE m.name = 'sistema_contable';
END
ELSE
BEGIN
    PRINT '❌ Usuario sistema_contable NO encontrado en la base de datos';
    PRINT '   Ejecuta: database/crear-usuario-sql.sql';
END
GO

PRINT '';
PRINT '═══════════════════════════════════════════════════';
PRINT 'Verificando modo de autenticación del servidor';
PRINT '═══════════════════════════════════════════════════';
PRINT '';

DECLARE @AuthMode INT;
EXEC xp_instance_regread
    N'HKEY_LOCAL_MACHINE',
    N'Software\Microsoft\MSSQLServer\MSSQLServer',
    N'LoginMode',
    @AuthMode OUTPUT;

IF @AuthMode = 1
BEGIN
    PRINT '⚠️  Modo actual: Solo autenticación de Windows';
    PRINT '   Necesitas habilitar autenticación mixta';
    PRINT '   Ejecuta: database/habilitar-autenticacion-mixta.sql';
END
ELSE IF @AuthMode = 2
BEGIN
    PRINT '✅ Modo actual: Autenticación mixta (Windows + SQL)';
    PRINT '   El servidor está configurado correctamente';
END
ELSE
BEGIN
    PRINT '❓ Modo de autenticación desconocido';
END
GO

PRINT '';


