# Configuración de Autenticación SQL Server

El sistema puede usar dos tipos de autenticación:

## Opción 1: Autenticación SQL Server (Recomendado para desarrollo)

### Paso 1: Crear usuario SQL

Ejecuta el script:
```sql
database/crear-usuario-sql.sql
```

O manualmente en SQL Server Management Studio:

```sql
USE master;
GO
CREATE LOGIN sistema_contable
WITH PASSWORD = 'SistemaContable2024!',
     DEFAULT_DATABASE = MiBaseDeContabilidad;

USE MiBaseDeContabilidad;
GO
CREATE USER sistema_contable FOR LOGIN sistema_contable;
ALTER ROLE db_datareader ADD MEMBER sistema_contable;
ALTER ROLE db_datawriter ADD MEMBER sistema_contable;
ALTER ROLE db_ddladmin ADD MEMBER sistema_contable;
```

### Paso 2: Configurar el backend

El backend ya está configurado para usar:
- **Usuario**: `sistema_contable`
- **Contraseña**: `SistemaContable2024!`

Puedes cambiarlo usando variables de entorno:
```bash
set DB_USER=tu_usuario
set DB_PASSWORD=tu_contraseña
```

## Opción 2: Autenticación de Windows (Integrated Security)

### Habilitar autenticación mixta en SQL Server:

1. Abre SQL Server Management Studio
2. Clic derecho en el servidor → Properties
3. Security → Selecciona "SQL Server and Windows Authentication mode"
4. Reinicia SQL Server

### Configurar el backend:

En `backend/src/server.ts`, cambia:

```typescript
// De:
user: process.env.DB_USER || 'sistema_contable',
password: process.env.DB_PASSWORD || 'SistemaContable2024!'

// A:
authentication: {
  type: 'default' // Usa autenticación integrada de Windows
}
```

### Otorgar permisos al usuario de Windows:

```sql
USE MiBaseDeContabilidad;
GO
CREATE USER [DOMINIO\usuario] FOR LOGIN [DOMINIO\usuario];
ALTER ROLE db_datareader ADD MEMBER [DOMINIO\usuario];
ALTER ROLE db_datawriter ADD MEMBER [DOMINIO\usuario];
```

## Verificar la conexión

Después de configurar, prueba la conexión:

```bash
cd backend
npm run validar-db
```


