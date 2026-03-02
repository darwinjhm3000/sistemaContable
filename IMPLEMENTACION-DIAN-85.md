# 📋 Implementación de Sincronización con DIAN - Descarga de Facturas

## 🎯 Objetivo
Implementar funcionalidad para sincronizar y descargar facturas de compra y venta desde los servicios web de la DIAN (Dirección de Impuestos y Aduanas Nacionales de Colombia).

---

## ✅ Estado Actual del Sistema

### Lo que ya está implementado:
1. ✅ **Generación de CUFE/CUDE** según Resolución DIAN 000085
2. ✅ **Campos en base de datos** para almacenar:
   - CUFE/CUDE
   - QR Code
   - Estado de validación DIAN
   - XML de factura electrónica
   - Fecha de validación DIAN
3. ✅ **Tabla ConfiguracionDIAN** para credenciales y configuración
4. ✅ **Endpoints básicos** para facturas y compras

---

## 🔧 Lo que se Necesita Implementar

### 1. Requisitos Previos

#### **A. Certificado Digital**
- 📜 Certificado digital (.pfx o .p12) emitido por la DIAN
- 🔑 Contraseña del certificado
- ⚠️ Certificado debe estar vigente (renovar antes de vencer)

#### **B. Credenciales DIAN**
- 👤 Usuario DIAN (para ambiente de Pruebas y Producción)
- 🔒 Contraseña DIAN
- 📍 NIT de la empresa registrado en la DIAN

#### **C. Software ID y PIN**
- 🆔 Software ID (registrado en la DIAN)
- 🔐 PIN del software

---

## 🌐 Servicios Web de la DIAN Disponibles

### **1. Ondemand Query (Consulta bajo demanda)**
- **Propósito**: Consultar eventos de aceptación/rechazo de documentos
- **Método**: SOAP o REST
- **Endpoints**:
  - **Pruebas**: `https://vpfe-hab.dian.gov.co/WcfDianCustomerServices.svc?wsdl`
  - **Producción**: `https://vpfe.dian.gov.co/WcfDianCustomerServices.svc?wsdl`

### **2. Consulta de Documentos (REST API)**
- **Propósito**: Descargar XMLs de facturas electrónicas
- **Base URL Pruebas**: `https://api-hab.dian.gov.co`
- **Base URL Producción**: `https://api.dian.gov.co`

### **3. Endpoints Principales**:

```
GET  /v1/documents/{trackId}          - Obtener estado de documento
GET  /v1/documents/{trackId}/xml      - Descargar XML del documento
GET  /v1/documents/{trackId}/pdf      - Descargar PDF del documento (si existe)
POST /v1/events                       - Consultar eventos de documentos
GET  /v1/events/range                 - Consultar eventos por rango de fechas
```

---

## 📦 Dependencias Necesarias

### **Paquetes NPM a Instalar:**

```bash
npm install axios soap xml2js node-forge node-p12
npm install --save-dev @types/xml2js @types/soap
```

**Descripción:**
- `axios`: Cliente HTTP para llamadas REST a la API de DIAN
- `soap`: Cliente SOAP para Ondemand Query
- `xml2js`: Parser XML para procesar respuestas
- `node-forge`: Manejo de certificados digitales y firmas
- `node-p12`: Extraer información de certificados .p12/.pfx

---

## 🏗️ Estructura de Implementación Recomendada

### **1. Servicio de Sincronización DIAN** (`backend/src/services/dian-sync.service.ts`)

```typescript
// Funciones principales:
- obtenerConfiguracionDIAN(idEmpresa)
- autenticarDIAN(configuracion)
- consultarEventosFacturas(fechaDesde, fechaHasta)
- descargarXMLFactura(trackId, cufe)
- sincronizarFacturas(fechaDesde, fechaHasta)
- actualizarEstadoFactura(idFactura, estado, mensaje)
```

### **2. Endpoints REST** (agregar a `server.ts`)

```
POST   /api/dian/sincronizar             - Sincronizar facturas desde DIAN
GET    /api/dian/estado/:cufe            - Consultar estado de factura
GET    /api/dian/descargar/:cufe         - Descargar XML de factura
POST   /api/dian/consultar-eventos       - Consultar eventos por fecha
GET    /api/dian/configuracion           - Obtener configuración DIAN
PUT    /api/dian/configuracion           - Actualizar configuración DIAN
```

### **3. Tablas de Base de Datos**

**Ya existe:**
- ✅ `ConfiguracionDIAN` - Configuración de credenciales
- ✅ `Facturas` con campos DIAN (CUFE, EstadoValidacionDIAN, etc.)

**Nuevas tablas sugeridas:**

```sql
-- Tabla para logs de sincronización
CREATE TABLE LogSincronizacionDIAN (
    IdLog INT IDENTITY(1,1) PRIMARY KEY,
    IdEmpresa INT NOT NULL,
    FechaInicio DATETIME NOT NULL,
    FechaFin DATETIME NULL,
    TipoSincronizacion NVARCHAR(50), -- 'Facturas', 'Compras'
    RangoFechas NVARCHAR(100), -- '2024-01-01 a 2024-01-31'
    DocumentosEncontrados INT DEFAULT 0,
    DocumentosProcesados INT DEFAULT 0,
    DocumentosConError INT DEFAULT 0,
    Estado NVARCHAR(20), -- 'EnProceso', 'Completado', 'Error'
    MensajeError NVARCHAR(MAX),
    FOREIGN KEY (IdEmpresa) REFERENCES Empresa(IdEmpresa)
);

-- Tabla para eventos DIAN
CREATE TABLE EventosDIAN (
    IdEvento INT IDENTITY(1,1) PRIMARY KEY,
    TrackId NVARCHAR(100) UNIQUE,
    CUFE NVARCHAR(100),
    TipoDocumento NVARCHAR(10), -- 'FV', 'NC', 'ND'
    Estado NVARCHAR(50), -- 'Aceptado', 'Rechazado', 'Anulado'
    FechaEvento DATETIME,
    Mensaje NVARCHAR(500),
    XMLRespuesta XML,
    FechaConsulta DATETIME DEFAULT GETDATE(),
    INDEX IX_EventosDIAN_CUFE (CUFE),
    INDEX IX_EventosDIAN_TrackId (TrackId)
);
```

---

## 🔐 Seguridad y Autenticación

### **1. Manejo de Certificados**
- Almacenar certificados encriptados en `ConfiguracionDIAN.CertificadoDigital`
- Usar variables de entorno para contraseñas sensibles
- Implementar rotación automática de certificados (alerta antes de vencer)

### **2. Firma de Peticiones**
- Todas las peticiones a DIAN deben ir firmadas digitalmente
- Usar el certificado para firmar los SOAP envelopes o headers REST

### **3. Encriptación de Credenciales**
- Encriptar contraseñas en base de datos
- Usar librerías como `crypto` de Node.js para encriptación AES-256

---

## 📋 Flujo de Sincronización

### **Sincronización de Facturas de Venta (Emitidas por la empresa)**

1. **Obtener configuración DIAN** de la empresa
2. **Autenticar con DIAN** usando certificado y credenciales
3. **Consultar eventos** en rango de fechas:
   - Facturas aceptadas
   - Facturas rechazadas
   - Notas crédito/débito
4. **Para cada evento:**
   - Buscar factura local por CUFE
   - Actualizar estado (`EstadoValidacionDIAN`)
   - Guardar mensaje de respuesta
   - Si es necesario, descargar XML completo
5. **Registrar log** de sincronización

### **Sincronización de Facturas de Compra (Recibidas de proveedores)**

1. **Obtener NITs de proveedores** activos
2. **Para cada proveedor:**
   - Consultar documentos donde la empresa es receptor
   - Descargar XMLs de facturas recibidas
   - Crear registros en tabla `Compras` si no existen
3. **Actualizar estados** de documentos recibidos

---

## 🚀 Pasos de Implementación

### **Fase 1: Configuración y Autenticación**
1. ✅ Crear servicio de autenticación DIAN
2. ✅ Implementar manejo de certificados digitales
3. ✅ Crear endpoints para gestionar configuración DIAN
4. ✅ Implementar encriptación de credenciales

### **Fase 2: Consulta de Eventos**
1. ✅ Implementar cliente SOAP para Ondemand Query
2. ✅ Crear función para consultar eventos por fecha
3. ✅ Procesar respuestas XML de DIAN
4. ✅ Mapear estados de DIAN a estados locales

### **Fase 3: Descarga de Documentos**
1. ✅ Implementar descarga de XML por CUFE/TrackId
2. ✅ Parser XML de facturas DIAN
3. ✅ Extraer datos relevantes del XML
4. ✅ Almacenar XMLs en base de datos

### **Fase 4: Sincronización Automática**
1. ✅ Implementar sincronización completa
2. ✅ Crear tarea programada (cron job)
3. ✅ Sistema de logs y manejo de errores
4. ✅ Notificaciones de errores de sincronización

### **Fase 5: Interfaz de Usuario**
1. ✅ Pantalla de configuración DIAN
2. ✅ Botón de sincronización manual
3. ✅ Vista de logs de sincronización
4. ✅ Indicadores de estado de facturas DIAN

---

## 📝 Ejemplo de Uso (API)

### **1. Configurar Credenciales DIAN**

```http
PUT /api/dian/configuracion
Content-Type: application/json

{
  "idEmpresa": 1,
  "ambiente": "Pruebas",
  "usuarioDIAN": "usuario@empresa.com",
  "passwordDIAN": "contraseña",
  "softwareId": "123456789",
  "pinSoftware": "1234",
  "urlProduccion": "https://vpfe.dian.gov.co",
  "urlPruebas": "https://vpfe-hab.dian.gov.co"
}
```

### **2. Sincronizar Facturas**

```http
POST /api/dian/sincronizar
Content-Type: application/json

{
  "idEmpresa": 1,
  "fechaDesde": "2024-01-01",
  "fechaHasta": "2024-01-31",
  "tipoDocumento": "Facturas" // o "Compras"
}
```

### **3. Consultar Estado de Factura**

```http
GET /api/dian/estado/FVE00000001
```

### **4. Descargar XML de Factura**

```http
GET /api/dian/descargar/FVE00000001
```

---

## ⚠️ Consideraciones Importantes

### **1. Límites de la API DIAN**
- **Rate Limiting**: La DIAN puede tener límites de peticiones por minuto
- **Implementar retry logic** con backoff exponencial
- **Cachear respuestas** cuando sea posible

### **2. Manejo de Errores**
- **Certificado expirado**: Notificar al usuario
- **Credenciales inválidas**: Validar antes de intentar
- **Red no disponible**: Reintentar más tarde
- **Documento no encontrado**: Registrar y continuar

### **3. Performance**
- **Sincronización incremental**: Solo consultar fechas nuevas
- **Procesamiento en lotes**: Agrupar múltiples documentos
- **Uso de índices**: Optimizar consultas por CUFE

### **4. Cumplimiento Legal**
- **Almacenamiento de XMLs**: Requerido por ley (10 años)
- **Auditoría**: Mantener logs de todas las sincronizaciones
- **Privacidad**: Encriptar datos sensibles

---

## 🔗 Recursos Adicionales

### **Documentación Oficial DIAN:**
- [Portal de Facturación Electrónica](https://www.dian.gov.co/facturaelectronica)
- [Manual Técnico de Facturación Electrónica](https://www.dian.gov.co/facturaelectronica/DocumentosTecnicos)
- [Ambiente de Pruebas](https://catalogo-vpfe.dian.gov.co/)

### **Herramientas Útiles:**
- [Validador de XML DIAN](https://catalogo-vpfe.dian.gov.co/document/searchqr)
- [Consultas de Estructura](https://www.dian.gov.co/facturaelectronica/Herramientas)

---

## ✅ Checklist de Implementación

- [ ] Instalar dependencias necesarias (axios, soap, xml2js, etc.)
- [ ] Crear servicio de autenticación DIAN
- [ ] Implementar manejo de certificados digitales
- [ ] Crear tablas de logs y eventos en base de datos
- [ ] Implementar consulta de eventos (SOAP/REST)
- [ ] Implementar descarga de XMLs
- [ ] Crear endpoints REST para sincronización
- [ ] Implementar sincronización automática (cron job)
- [ ] Agregar manejo de errores y retry logic
- [ ] Crear interfaz de usuario para configuración
- [ ] Crear vista de logs de sincronización
- [ ] Implementar pruebas unitarias
- [ ] Documentar API endpoints
- [ ] Configurar alertas de certificados próximos a vencer

---

## 📞 Soporte

Para implementar esta funcionalidad, es recomendable:
1. Contactar con un proveedor de servicios de facturación electrónica autorizado por DIAN
2. Revisar la documentación técnica oficial de DIAN
3. Realizar pruebas exhaustivas en ambiente de pruebas antes de producción
4. Considerar el uso de bibliotecas comerciales especializadas si el presupuesto lo permite

---

**Última actualización**: 2024
**Versión**: 1.0
