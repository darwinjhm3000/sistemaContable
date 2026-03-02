# 🔄 Conversión Automática de PDF a Imagen para OCR

## 📋 Problema Resuelto

**Error anterior:**
> "Error en OCR desde buffer: Error attempting to read image"

**Causa:**
- Tesseract.js no puede procesar PDFs directamente
- Los PDFs escaneados necesitan convertirse a imagen primero

## ✅ Solución Implementada

### 1. **Nuevo Servicio: `pdf-to-image.service.ts`**
- Convierte páginas de PDF a imágenes PNG usando `pdfjs-dist` y `canvas`
- Escala de 2.0x para mejor calidad de OCR
- Soporta conversión de página específica o todas las páginas

### 2. **Flujo Mejorado en `invoice-extractor.service.ts`**

```
PDF Subido
    ↓
¿Tiene texto extraíble? (>30 caracteres)
    ├─ SÍ → Extrae texto directamente (95% confianza)
    └─ NO → Convierte PDF a imagen PNG
            ↓
            Aplica OCR en la imagen
            ↓
            Extrae datos de la factura
```

### 3. **Dependencias Instaladas**
- `pdfjs-dist`: Para parsear y renderizar PDFs
- `canvas`: Para crear imágenes desde el renderizado del PDF

## 🔧 Archivos Modificados

1. **`backend/src/services/ocr/pdf-to-image.service.ts`** (NUEVO)
   - `convertPDFPageToImage()`: Convierte una página específica
   - `convertPDFToImages()`: Convierte todas las páginas
   - `convertFirstPDFPageToImage()`: Convierte solo la primera página (para facturas)

2. **`backend/src/services/ocr/invoice-extractor.service.ts`**
   - Integración de conversión PDF → Imagen → OCR
   - Manejo mejorado de errores
   - Logging detallado del proceso

3. **`backend/package.json`**
   - Agregado: `pdfjs-dist`
   - Agregado: `canvas`

## 📊 Logs Esperados

### PDF Escaneado (Nuevo Flujo):
```
📄 Archivo PDF detectado, analizando contenido...
   📊 Análisis de PDF:
      Páginas: 1
      Texto extraído: 5 caracteres
   ⚠️  Texto muy corto (5 caracteres), puede ser PDF escaneado
🖼️ PDF sin texto suficiente, convirtiendo a imagen para OCR...
   🔄 Convirtiendo PDF a imagen...
   📄 Cargando PDF (página 1)...
   📄 PDF cargado: 1 página(s)
   📐 Dimensiones de página: 1654x2339px (escala: 2x)
   🎨 Renderizando página 1...
   ✅ Página renderizada
   💾 Imagen generada: 1234567 bytes
   ✅ PDF convertido a imagen: 1234567 bytes
   🔍 Aplicando OCR en la imagen...
   ✅ OCR completado: 1234 caracteres extraídos (confianza: 85.5%)
```

### PDF con Texto (Flujo Original):
```
📄 Archivo PDF detectado, analizando contenido...
   📊 Análisis de PDF:
      Páginas: 1
      Texto extraído: 1234 caracteres
📄 PDF tiene texto extraíble, extrayendo directamente...
   ✅ Texto extraído del PDF: 1234 caracteres
```

## 🧪 Pruebas

### Caso 1: PDF Escaneado (Solo Imágenes)
1. Sube un PDF escaneado
2. El sistema detectará que no tiene texto
3. Convertirá automáticamente a imagen
4. Aplicará OCR
5. Extraerá los datos de la factura

### Caso 2: PDF con Texto
1. Sube un PDF con texto seleccionable
2. El sistema extraerá el texto directamente
3. No necesitará conversión ni OCR

### Caso 3: PDF Mixto (Poco Texto)
1. Sube un PDF con poco texto extraíble
2. El sistema intentará extraer texto primero
3. Si es insuficiente, convertirá a imagen y aplicará OCR

## ⚙️ Configuración

### Factor de Escala
- **Default:** 2.0x (buena calidad para OCR)
- **Ajustable:** En `convertFirstPDFPageToImage(pdfBuffer, scaleFactor)`
- **Recomendado:** 2.0-3.0 para OCR (mayor = mejor calidad pero más lento)

### Páginas Procesadas
- **Default:** Solo primera página (para facturas típicas)
- **Múltiples páginas:** Usar `convertPDFToImages()` si es necesario

## 🚀 Ventajas

1. **Automático:** No requiere conversión manual
2. **Inteligente:** Detecta si necesita conversión o no
3. **Eficiente:** Solo convierte si es necesario
4. **Calidad:** Escala 2x para mejor precisión de OCR
5. **Robusto:** Manejo de errores mejorado

## ⚠️ Notas Técnicas

- **Node.js Version:** Requiere Node.js 20+ (warnings en 18, pero funciona)
- **Canvas:** Requiere dependencias nativas (instaladas automáticamente)
- **Memoria:** PDFs grandes pueden consumir más memoria durante la conversión
- **Rendimiento:** La conversión añade ~2-5 segundos al procesamiento

## 🔍 Troubleshooting

### Error: "Cannot find module 'canvas'"
```bash
cd backend
npm install canvas
```

### Error: "Error al convertir PDF a imagen"
- Verifica que el PDF no esté corrupto
- Revisa los logs para el error específico
- Intenta con otro PDF

### OCR de baja calidad
- Aumenta el `scaleFactor` a 3.0 en `convertFirstPDFPageToImage()`
- Verifica que el PDF original tenga buena resolución

## 📝 Próximas Mejoras (Opcional)

1. **Procesamiento de múltiples páginas:** Si la factura tiene varias páginas
2. **Optimización de memoria:** Para PDFs muy grandes
3. **Cache de conversiones:** Evitar reconvertir el mismo PDF
4. **Ajuste automático de escala:** Basado en la calidad del PDF

