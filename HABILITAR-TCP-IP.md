# Instrucciones para Habilitar TCP/IP en SQL Server

Si estás recibiendo el error "Could not connect", es probable que SQL Server no tenga TCP/IP habilitado.

## Pasos para habilitar TCP/IP:

1. **Abrir SQL Server Configuration Manager:**
   - Presiona `Win + R`
   - Escribe: `SQLServerManager16.msc` (o la versión que tengas instalada)
   - O busca "SQL Server Configuration Manager" en el menú inicio

2. **Habilitar TCP/IP:**
   - En el panel izquierdo, expande "SQL Server Network Configuration"
   - Haz clic en "Protocols for MSSQLSERVER" (o tu instancia)
   - En el panel derecho, haz clic derecho en "TCP/IP" y selecciona "Enable"
   - Reinicia el servicio SQL Server

3. **Verificar que el puerto 1433 esté configurado:**
   - Haz doble clic en "TCP/IP"
   - Ve a la pestaña "IP Addresses"
   - Desplázate hasta el final hasta "IPAll"
   - Asegúrate de que "TCP Dynamic Ports" esté vacío o configurado
   - Asegúrate de que "TCP Port" esté configurado como 1433 (o el puerto que desees usar)

4. **Reiniciar SQL Server:**
   - Ve a "SQL Server Services" en Configuration Manager
   - Haz clic derecho en "SQL Server (MSSQLSERVER)"
   - Selecciona "Restart"

5. **Verificar conexión:**
   - Ejecuta: `npm run validar-db` en la carpeta backend

## Alternativa: Usar SQL Server Management Studio (SSMS)

Si tienes SSMS instalado, puedes:
1. Conectar usando "Server name: DESKTOP-PTP75MU"
2. Si funciona en SSMS, el problema puede ser de configuración del driver mssql


