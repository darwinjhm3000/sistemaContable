# Validación de Zona Horaria - Bogotá, Colombia

## Configuración Implementada

El sistema ha sido configurado para usar la zona horaria de **Bogotá, Colombia (America/Bogota, UTC-5)**.

### Cambios Realizados

1. **Configuración en `server.ts`**:
   - Se establece `process.env.TZ = 'America/Bogota'` al inicio del archivo
   - Se importa la utilidad `getInfoZonaHoraria()` para mostrar información de la zona horaria

2. **Utilidades de Fechas (`backend/src/utils/fechas.ts`)**:
   - `getFechaActualBogota()`: Obtiene la fecha actual en zona horaria de Bogotá
   - `formatearFechaBogota()`: Formatea fechas a YYYY-MM-DD
   - `getFechaHoyBogota()`: Obtiene la fecha de hoy en formato YYYY-MM-DD
   - `getFechaHoraActualBogota()`: Obtiene fecha y hora actual con offset -05:00
   - `convertirUTCABogota()`: Convierte fechas UTC a zona horaria de Bogotá
   - `validarFecha()`: Valida formato de fechas
   - `getInfoZonaHoraria()`: Obtiene información completa de la zona horaria

3. **Scripts de Inicio**:
   - `package.json`: Los scripts `start` y `dev` establecen `TZ=America/Bogota`
   - `iniciar-backend.bat`: Establece la variable de entorno `TZ` antes de iniciar

## Verificación

### Verificar Zona Horaria del Sistema

En PowerShell:
```powershell
[System.TimeZoneInfo]::Local.Id
Get-Date -Format "yyyy-MM-dd HH:mm:ss zzz"
```

Debería mostrar:
- **Zona Horaria**: `SA Pacific Standard Time` o `America/Bogota`
- **Offset**: `-05:00`

### Verificar en el Backend

Al iniciar el backend, deberías ver:
```
🕐 Configuración de Zona Horaria:
   Zona: America/Bogota (UTC-5)
   Offset: UTC-5
   Fecha actual: YYYY-MM-DD
   Hora actual: DD/MM/YYYY, HH:MM:SS
```

### Verificar Fechas en la Base de Datos

Las fechas almacenadas en la base de datos se manejan como `DATE` o `DATETIME` y se interpretan según la zona horaria configurada.

## Notas Importantes

1. **Zona Horaria del Sistema**: El sistema Windows debe estar configurado con "SA Pacific Standard Time" (Bogotá, Colombia)

2. **Node.js**: Node.js usa la zona horaria del sistema operativo por defecto. Con la configuración `TZ=America/Bogota`, se fuerza el uso de esta zona horaria.

3. **Base de Datos**: SQL Server almacena fechas sin información de zona horaria. Las fechas se interpretan según la configuración del servidor.

4. **Frontend**: El frontend puede mostrar fechas en la zona horaria del navegador del usuario, pero el backend siempre procesa fechas en zona horaria de Bogotá.

## Solución de Problemas

### Si las fechas no coinciden:

1. Verificar que el sistema Windows esté configurado con la zona horaria correcta:
   - Panel de Control → Reloj y región → Fecha y hora → Zona horaria
   - Debe estar en: "(UTC-05:00) Bogotá, Lima, Quito"

2. Reiniciar el backend después de los cambios

3. Verificar que la variable `TZ` esté establecida:
   ```powershell
   $env:TZ
   ```
   Debería mostrar: `America/Bogota`

## Fechas y Horas en el Sistema

- **Facturas**: Se almacenan con la fecha proporcionada por el usuario
- **Asientos Contables**: Usan la fecha de la transacción
- **Auditoría**: Los campos `FechaCreacion` y `FechaModificacion` usan la zona horaria del servidor

