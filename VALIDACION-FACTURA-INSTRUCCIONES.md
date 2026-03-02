# Instrucciones para Validar Factura PDF

## 📋 Resumen de la Factura Alkosto

### Datos Principales
- **Número**: X2672547037
- **Fecha**: 2024-12-04
- **Proveedor**: Colombiana de Comercio S.A. (Alkosto)
- **NIT**: 890900943-1
- **Cliente**: HERMES DANIEL GOMEZ RIVERO
- **Total**: $949.050

### Producto
- **Código**: 8806097113355
- **Descripción**: Cel5G Samsung A26 256GB*Ng
- **Cantidad**: 1
- **Precio**: $1.349.050
- **Descuento**: $400.000 (29,65%)
- **Subtotal**: $949.050
- **IVA**: 0% (exento)

## 🔧 Opción 1: Validación desde la Interfaz Web

### Pasos:

1. **Asegúrate de que el backend esté corriendo**:
   ```bash
   cd backend
   npm start
   ```

2. **Abre el frontend** en el navegador:
   - URL: http://localhost:3000
   - Navega a: **Compras**

3. **Sube la factura PDF**:
   - Haz clic en el botón **"Escanear PDF"**
   - Selecciona el archivo `Factura.pdf`
   - Espera a que se procese

4. **Verifica los datos extraídos**:
   - El sistema debería mostrar:
     - Número de factura: X2672547037
     - Fecha: 2024-12-04
     - NIT Proveedor: 890900943-1
     - Nombre Proveedor: Alkosto o Colombiana de Comercio S.A.
     - Items con el producto Samsung A26
     - Totales correctos

## 🔧 Opción 2: Validación desde Línea de Comandos

### Requisitos:
1. El archivo `Factura.pdf` debe estar en el directorio `backend/`
2. El backend debe tener todas las dependencias instaladas

### Pasos:

1. **Coloca el archivo PDF**:
   ```bash
   # Copia Factura.pdf al directorio backend/
   copy Factura.pdf backend\Factura.pdf
   ```

2. **Ejecuta el script de validación**:
   ```bash
   cd backend
   npm run validar-factura
   ```

3. **Revisa los resultados**:
   - El script mostrará qué datos se extrajeron
   - Comparará con los datos esperados
   - Mostrará el porcentaje de coincidencias

## 📊 Datos Esperados vs Extraídos

El sistema debería extraer correctamente:

| Campo | Esperado | Estado |
|-------|----------|--------|
| Número Factura | X2672547037 | ⏳ Por validar |
| Fecha | 2024-12-04 | ⏳ Por validar |
| NIT Proveedor | 890900943-1 | ⏳ Por validar |
| Nombre Proveedor | Alkosto/Colombiana | ⏳ Por validar |
| Items | 1 producto | ⏳ Por validar |
| Subtotal | $949.050 | ⏳ Por validar |
| IVA | $0 | ⏳ Por validar |
| Total | $949.050 | ⏳ Por validar |

## ⚠️ Problemas Comunes y Soluciones

### Error: "Archivo no encontrado"
**Solución**: Asegúrate de que `Factura.pdf` esté en el directorio `backend/`

### Error: "Error en OCR: undefined"
**Solución**:
1. Reinicia el backend
2. Verifica que Tesseract.js esté instalado correctamente
3. Revisa los logs del backend para más detalles

### Error: "PDF escaneado detectado"
**Solución**:
- Si el PDF es una imagen escaneada, conviértelo a imagen (PNG/JPG) primero
- O usa un PDF con texto extraíble

### Fecha incorrecta (día anterior)
**Solución**: Ya corregido en el código. Asegúrate de usar la versión actualizada del frontend.

## ✅ Checklist de Validación

- [ ] Backend corriendo en puerto 3001
- [ ] Frontend corriendo en puerto 3000
- [ ] Archivo Factura.pdf disponible
- [ ] Dependencias instaladas (npm install)
- [ ] Backend compilado (npm run build)

## 📝 Notas Importantes

1. **Fecha Futura**: La factura muestra "2025/12/04" pero probablemente es "2024/12/04"
2. **IVA 0%**: El producto es exento de IVA, esto es normal
3. **Descuento**: El sistema debe capturar el descuento del 29,65%
4. **CUFE**: La factura tiene CUFE válido para validación DIAN

## 🚀 Próximos Pasos Después de la Validación

1. Si la extracción es exitosa (>80% coincidencias):
   - El sistema está funcionando correctamente
   - Puedes usar el escaneo de PDFs en producción

2. Si hay problemas:
   - Revisa los logs del backend
   - Verifica que el PDF tenga texto extraíble
   - Considera convertir PDFs escaneados a imágenes

3. Mejoras sugeridas:
   - Agregar validación de CUFE
   - Mejorar detección de fechas futuras
   - Optimizar extracción de descuentos

