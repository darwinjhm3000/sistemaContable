-- ============================================
-- Script para habilitar autenticación mixta
-- SQL Server and Windows Authentication mode
-- ============================================

USE master;
GO

-- Habilitar autenticación mixta
EXEC xp_instance_regwrite
    N'HKEY_LOCAL_MACHINE',
    N'Software\Microsoft\MSSQLServer\MSSQLServer',
    N'LoginMode',
    REG_DWORD,
    2; -- 1 = Solo Windows, 2 = Mixta (Windows + SQL)
GO

PRINT '═══════════════════════════════════════════════════';
PRINT '✅ Autenticación mixta habilitada';
PRINT '═══════════════════════════════════════════════════';
PRINT '';
PRINT '⚠️  IMPORTANTE: Debes REINICIAR SQL Server para que los cambios surtan efecto.';
PRINT '';
PRINT 'Pasos:';
PRINT '1. Ejecuta este script';
PRINT '2. Reinicia SQL Server desde Configuration Manager';
PRINT '3. Prueba la conexión nuevamente';
PRINT '';


