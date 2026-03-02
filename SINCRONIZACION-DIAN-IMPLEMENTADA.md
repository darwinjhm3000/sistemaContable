# ✅ Sincronización DIAN - Implementación Completada

## 📋 Resumen

Se ha implementado la funcionalidad para sincronizar y descargar facturas de compra y venta desde los servicios web de la DIAN.

---

## 🎯 Lo que se ha Implementado

### 1. ✅ Base de Datos
- **Script SQL**: `database/crear-tablas-dian-sincronizacion.sql`
  - Tabla `LogSincronizacionDIAN` - Para registrar logs de sincronización
  - Tabla `EventosDIAN` - Para almacenar eventos de documentos DIAN
  - Índices optimizados para consultas rápidas

**Para ejecutar:**
```sql
USE MiBaseDeContabilidad;
GO
-- Ejecutar: database/crear-tablas-dian-sincronizacion.sql
```

### 2. ✅ Servicios Implementados

#### **`backend/src/utils/encryption.ts`**
- Encriptación/desencriptación AES-256-CBC para credenciales
- Funciones: `encrypt()`, `decrypt()`, `hash()`
- Usa variable de entorno `DIAN_ENCRYPTION_KEY` (32 caracteres)

#### **`backend/src/services/dian-sync.service.ts`**
- `obtenerConfiguracionDIAN()` - Obtiene configuración de DIAN
- `sincronizarFacturas()` - Sincroniza facturas desde DIAN
- `consultarEventosDIAN()` - Consulta eventos en DIAN (SOAP)
- `descargarXMLFactura()` - Descarga XML de factura (REST)
- `consultarEstadoFactura()` - Consulta estado por CUFE

### 3. ✅ Endpoints REST Implementados

#### **GET** `/api/dian/configuracion`
Obtiene la configuración DIAN de una empresa
```
Query params: idEmpresa (requerido)
```

#### **PUT** `/api/dian/configuracion`
Actualiza o crea configuración DIAN
```json
{
  "idEmpresa": 1,
  "ambiente": "Pruebas",
  "usuarioDIAN": "usuario@empresa.com",
  "passwordDIAN": "contraseña",
  "passwordCertificado": "contraseña_certificado",
  "fechaVencimientoCertificado": "2025-12-31",
  "urlProduccion": "https://vpfe.dian.gov.co",
  "urlPruebas": "https://vpfe-hab.dian.gov.co",
  "softwareId": "123456789",
  "pinSoftware": "1234"
}
```

#### **POST** `/api/dian/sincronizar`
Sincroniza facturas o compras desde DIAN
```json
{
  "idEmpresa": 1,
  "fechaDesde": "2024-01-01",
  "fechaHasta": "2024-01-31",
  "tipoDocumento": "Facturas" // o "Compras"
}
```

#### **GET** `/api/dian/estado/:cufe`
Consulta el estado de una factura por CUFE
```
Ejemplo: GET /api/dian/estado/ABC123XYZ789
```

#### **GET** `/api/dian/descargar/:cufe`
Descarga el XML de una factura por CUFE
```
Query params: idEmpresa (requerido)
Ejemplo: GET /api/dian/descargar/ABC123XYZ789?idEmpresa=1
```

#### **GET** `/api/dian/logs`
Obtiene los logs de sincronización
```
Query params: 
  - idEmpresa (opcional)
  - limite (opcional, default: 50)
```

---

## 📦 Dependencias Instaladas

Las siguientes dependencias han sido instaladas en `backend/`:
- ✅ `axios` - Cliente HTTP para REST API
- ✅ `soap` - Cliente SOAP para Ondemand Query
- ✅ `xml2js` - Parser XML
- ✅ `node-forge` - Manejo de certificados
- ✅ `@types/xml2js` - Tipos TypeScript
- ✅ `@types/soap` - Tipos TypeScript (nota: soap ya incluye tipos)

---

## 🚀 Pasos para Usar

### **Paso 1: Ejecutar Script SQL**
```sql
-- Ejecutar el script en SQL Server Management Studio
USE MiBaseDeContabilidad;
GO
-- Ejecutar: database/crear-tablas-dian-sincronizacion.sql
```

### **Paso 2: Configurar Variable de Entorno (Opcional)**
```bash
# En el archivo .env o variables de entorno
DIAN_ENCRYPTION_KEY=tu-clave-secreta-de-32-caracteres
```

**⚠️ IMPORTANTE**: Si no se configura, se usará una clave por defecto (NO SEGURA para producción).

### **Paso 3: Configurar Credenciales DIAN**
Usar el endpoint `PUT /api/dian/configuracion` para guardar:
- Usuario y contraseña DIAN
- Contraseña del certificado digital
- Software ID y PIN
- URLs de producción y pruebas

### **Paso 4: Sincronizar Facturas**
Usar el endpoint `POST /api/dian/sincronizar` con:
- `idEmpresa`
- `fechaDesde` y `fechaHasta`
- `tipoDocumento`: "Facturas" o "Compras"

---

## ⚠️ Notas Importantes

### **1. Certificado Digital**
- El certificado digital debe estar almacenado en la tabla `ConfiguracionDIAN.CertificadoDigital`
- Actualmente, el servicio espera que el certificado ya esté cargado en la base de datos
- **TODO**: Implementar endpoint para cargar certificado .pfx/.p12

### **2. Servicios SOAP de DIAN**
- El servicio `consultarEventosDIAN()` está implementado pero requiere ajustes según la versión exacta del WSDL de DIAN
- El método exacto puede variar (`GetStatusZip`, `GetStatus`, etc.)
- Se recomienda probar con el ambiente de pruebas de DIAN primero

### **3. API REST de DIAN**
- Los endpoints REST (`/v1/documents/...`) pueden variar según la versión
- Verificar documentación oficial de DIAN para la versión actual
- URLs base:
  - Pruebas: `https://api-hab.dian.gov.co`
  - Producción: `https://api.dian.gov.co`

### **4. Sincronización de Compras**
- La sincronización de compras está marcada como "pendiente de implementación"
- Requiere consultar documentos donde la empresa es receptor
- Se puede implementar siguiendo el mismo patrón que facturas

---

## 🔧 Mejoras Futuras

### **Prioridad Alta:**
- [ ] Implementar endpoint para cargar certificado digital (.pfx/.p12)
- [ ] Validar y ajustar métodos SOAP según WSDL real de DIAN
- [ ] Implementar sincronización de compras
- [ ] Agregar validación de certificados próximos a vencer

### **Prioridad Media:**
- [ ] Implementar sincronización automática (cron job)
- [ ] Agregar retry logic con backoff exponencial
- [ ] Mejorar manejo de errores y logging
- [ ] Agregar tests unitarios

### **Prioridad Baja:**
- [ ] Implementar interfaz de usuario para configuración DIAN
- [ ] Vista de logs de sincronización en frontend
- [ ] Indicadores de estado de facturas DIAN
- [ ] Notificaciones de errores de sincronización

---

## 📝 Ejemplo de Uso Completo

### **1. Configurar Credenciales DIAN**
```bash
curl -X PUT http://localhost:3001/api/dian/configuracion \
  -H "Content-Type: application/json" \
  -d '{
    "idEmpresa": 1,
    "ambiente": "Pruebas",
    "usuarioDIAN": "usuario@empresa.com",
    "passwordDIAN": "mi_password",
    "softwareId": "123456789",
    "pinSoftware": "1234"
  }'
```

### **2. Sincronizar Facturas**
```bash
curl -X POST http://localhost:3001/api/dian/sincronizar \
  -H "Content-Type: application/json" \
  -d '{
    "idEmpresa": 1,
    "fechaDesde": "2024-01-01",
    "fechaHasta": "2024-01-31",
    "tipoDocumento": "Facturas"
  }'
```

### **3. Consultar Estado de Factura**
```bash
curl http://localhost:3001/api/dian/estado/ABC123XYZ789
```

### **4. Descargar XML de Factura**
```bash
curl http://localhost:3001/api/dian/descargar/ABC123XYZ789?idEmpresa=1 \
  -o factura.xml
```

### **5. Ver Logs de Sincronización**
```bash
curl "http://localhost:3001/api/dian/logs?idEmpresa=1&limite=10"
```

---

## 🐛 Troubleshooting

### **Error: "No se encontró configuración DIAN"**
- Verificar que se haya ejecutado `PUT /api/dian/configuracion` primero
- Verificar que `idEmpresa` existe en la base de datos

### **Error: "Certificado expirado"**
- Renovar el certificado digital en la DIAN
- Actualizar `fechaVencimientoCertificado` en la configuración

### **Error: "Error al conectar con servicios DIAN"**
- Verificar que las URLs sean correctas
- Verificar credenciales (usuario/contraseña)
- Probar primero con ambiente de Pruebas

### **Error: "Error al consultar eventos"**
- Verificar que el método SOAP sea correcto según versión de DIAN
- Consultar documentación oficial de DIAN para métodos disponibles
- Verificar formato de fechas

---

## 📚 Referencias

- Documentación DIAN: https://www.dian.gov.co/facturaelectronica
- Manual Técnico: https://www.dian.gov.co/facturaelectronica/DocumentosTecnicos
- Ambiente de Pruebas: https://catalogo-vpfe.dian.gov.co/

---

**Última actualización**: 2024
**Versión de implementación**: 1.0
**Estado**: ✅ Funcional - Requiere configuración y pruebas con servicios reales de DIAN
