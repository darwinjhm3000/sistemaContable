USE MiBaseDeContabilidad;
GO

-- Eliminar la restricción CHECK existente
IF EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CK__Terceros__Tipo__59063A47')
BEGIN
    ALTER TABLE Terceros DROP CONSTRAINT CK__Terceros__Tipo__59063A47;
    PRINT '✅ Restricción CK__Terceros__Tipo__59063A47 eliminada';
END
ELSE
BEGIN
    PRINT '⚠️  La restricción CK__Terceros__Tipo__59063A47 no existe';
END
GO

-- Agregar nueva restricción CHECK que incluye V (Vendedor)
IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CK_Terceros_Tipo')
BEGIN
    ALTER TABLE Terceros
    ADD CONSTRAINT CK_Terceros_Tipo CHECK (Tipo IN ('C', 'P', 'V'));
    PRINT '✅ Nueva restricción CK_Terceros_Tipo agregada (C, P, V)';
END
ELSE
BEGIN
    PRINT '⚠️  La restricción CK_Terceros_Tipo ya existe';
END
GO

PRINT '';
PRINT '✅ Script ejecutado exitosamente';
PRINT 'Valores permitidos en Tipo: C (Cliente), P (Proveedor), V (Vendedor)';
GO

