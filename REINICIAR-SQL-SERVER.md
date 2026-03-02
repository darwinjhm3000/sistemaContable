# Instrucciones para Reiniciar SQL Server

Después de habilitar TCP/IP en SQL Server Configuration Manager, **es necesario reiniciar el servicio SQL Server** para que los cambios surtan efecto.

## Opción 1: Usar SQL Server Configuration Manager (Recomendado)

1. Abre **SQL Server Configuration Manager**
2. En el panel izquierdo, haz clic en **"SQL Server Services"**
3. En el panel derecho, encuentra **"SQL Server (MSSQLSERVER)"**
4. Haz clic derecho sobre él
5. Selecciona **"Restart"** (Reiniciar)
6. Espera a que el servicio se reinicie (puede tardar 30-60 segundos)

## Opción 2: Usar PowerShell (Como Administrador)

Abre PowerShell como **Administrador** y ejecuta:

```powershell
Restart-Service -Name "MSSQLSERVER" -Force
```

## Opción 3: Usar Services (Servicios) de Windows

1. Presiona `Win + R`
2. Escribe: `services.msc` y presiona Enter
3. Busca **"SQL Server (MSSQLSERVER)"**
4. Haz clic derecho y selecciona **"Reiniciar"**

## Verificar que TCP/IP esté funcionando

Después de reiniciar, verifica que el puerto 1433 esté escuchando:

```powershell
Test-NetConnection -ComputerName localhost -Port 1433
```

Si `TcpTestSucceeded` es `True`, entonces TCP/IP está funcionando correctamente.

## Probar la conexión del sistema

Una vez reiniciado SQL Server, prueba la conexión:

```bash
cd backend
npm run validar-db
```

O simplemente intenta iniciar sesión en la aplicación con:
- **Usuario**: `admin`
- **Contraseña**: `admin123`


