# Implementación Fase 1: OCR para Facturas de Compras

## 📋 Plan de Implementación

### Paso 1: Instalación de Dependencias

```bash
cd backend
npm install tesseract.js pdf-parse multer
npm install --save-dev @types/multer
```

### Paso 2: Estructura de Archivos

```
backend/src/
  services/
    ocr/
      pdf-parser.service.ts
      tesseract.service.ts
      invoice-extractor.service.ts
  routes/
    compras-ocr.route.ts (o integrar en server.ts)
```

### Paso 3: Servicios a Crear

1. **pdf-parser.service.ts**: Extrae texto de PDFs
2. **tesseract.service.ts**: OCR de imágenes
3. **invoice-extractor.service.ts**: Parsea texto y extrae datos estructurados

### Paso 4: Endpoint Backend

```typescript
POST /api/compras/scan-pdf
- Recibe: archivo PDF (multipart/form-data)
- Procesa: Extrae texto, aplica OCR si es necesario
- Retorna: Datos estructurados de la factura
```

### Paso 5: Frontend

- Componente de subida de archivo
- Vista previa de datos extraídos
- Formulario de confirmación/corrección
- Integración con formulario de compras existente

### Paso 6: Validación

- Validar proveedor contra base de datos
- Validar productos contra catálogo
- Verificar cálculos matemáticos
- Permitir edición manual

---

## 🎯 Funcionalidades Iniciales

1. ✅ Subir PDF de factura
2. ✅ Extraer texto automáticamente
3. ✅ Identificar proveedor (por NIT o nombre)
4. ✅ Extraer número de factura
5. ✅ Extraer fecha
6. ✅ Extraer artículos (código, nombre, cantidad, precio)
7. ✅ Calcular totales
8. ✅ Validar datos
9. ✅ Permitir corrección manual
10. ✅ Guardar como compra

---

## 📝 Próximos Pasos

1. ¿Qué alternativa prefieres? (Tesseract.js gratis o API de pago)
2. ¿Implementamos la Fase 1 completa?
3. ¿Agregamos validación inteligente desde el inicio?

