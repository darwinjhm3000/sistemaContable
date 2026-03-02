# Scripts de Base de Datos - Sistema Contable

Este directorio contiene los scripts SQL necesarios para crear y poblar la base de datos del sistema contable.

## Archivos

- **schema.sql**: Script para crear la estructura de la base de datos (tablas, índices, constraints)
- **datos-iniciales.sql**: Script para insertar datos iniciales (usuarios, cuentas PUC, terceros)
- **crear-base-datos.bat**: Script batch para ejecutar automáticamente ambos scripts

## Instrucciones de Instalación

### Opción 1: Usar el script batch (Recomendado)

1. Abre una terminal de comandos
2. Navega a la carpeta `database`
3. Ejecuta:
   ```bash
   crear-base-datos.bat
   ```

### Opción 2: Usar SQL Server Management Studio (SSMS)

1. Abre SQL Server Management Studio
2. Conéctate a tu instancia de SQL Server (`DESKTOP-PTP75MU`)
3. Abre el archivo `schema.sql`
4. Ejecuta el script (F5)
5. Abre el archivo `datos-iniciales.sql`
6. Asegúrate de que la base de datos `MiBaseDeContabilidad` esté seleccionada
7. Ejecuta el script (F5)

### Opción 3: Usar sqlcmd desde la línea de comandos

```bash
# Crear estructura
sqlcmd -S DESKTOP-PTP75MU -E -i schema.sql

# Insertar datos iniciales
sqlcmd -S DESKTOP-PTP75MU -E -i datos-iniciales.sql -d MiBaseDeContabilidad
```

## Estructura de la Base de Datos

### Tablas

1. **Usuarios**: Usuarios del sistema
2. **CuentasPUC**: Plan Único de Cuentas (estructura contable colombiana)
3. **Terceros**: Clientes y proveedores
4. **Comprobantes**: Cabecera de los asientos contables
5. **DetalleComprobante**: Detalle de movimientos contables

## Datos Iniciales

### Usuarios de Prueba

- **Usuario**: `admin`
  - **Contraseña**: `admin123`
  - **Rol**: Administrador

- **Usuario**: `contador`
  - **Contraseña**: `contador123`
  - **Rol**: Contador

### Cuentas del PUC

El script incluye una estructura básica del Plan Único de Cuentas de Colombia:
- Clase 1: Activos
- Clase 2: Pasivos
- Clase 3: Patrimonio
- Clase 4: Ingresos
- Clase 5: Gastos

### Terceros

Se incluyen algunos terceros de ejemplo para pruebas.

## Verificación

Después de ejecutar los scripts, puedes verificar que todo se haya creado correctamente ejecutando:

```bash
cd backend
npm run validar-db
```

Este comando validará la estructura de la base de datos y los datos iniciales.


