/**
 * Servicio para extraer datos estructurados de texto de factura
 */
import { extractTextFromPDFBuffer, hasExtractableText } from './pdf-parser.service';
import { recognizeImageBuffer } from './tesseract.service';
import { convertFirstPDFPageToImage } from './pdf-to-image.service';

export interface ExtractedInvoiceData {
  numeroFactura?: string;
  fecha?: string;
  nitProveedor?: string;
  nombreProveedor?: string;
  direccionProveedor?: string;
  items: Array<{
    codigo?: string;
    descripcion: string;
    cantidad: number;
    precioUnitario: number;
    descuento?: number;
    iva?: number;
    subtotal: number;
    total: number;
  }>;
  subtotal?: number;
  iva?: number;
  total?: number;
  observaciones?: string;
  confidence: number;
}

/**
 * Extrae datos de una factura desde un PDF
 * @param pdfBuffer Buffer del archivo PDF
 * @returns Datos estructurados de la factura
 */
/**
 * Detecta si un buffer es un PDF
 */
function isPDF(buffer: Buffer): boolean {
  // Los PDFs comienzan con %PDF
  return buffer.slice(0, 4).toString() === '%PDF';
}

/**
 * Detecta si un buffer es una imagen
 */
function isImage(buffer: Buffer): boolean {
  // PNG: 89 50 4E 47
  // JPEG: FF D8 FF
  const header = buffer.slice(0, 4);
  const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47]);
  const jpegSignature = buffer.slice(0, 3);
  const jpegSig = Buffer.from([0xFF, 0xD8, 0xFF]);

  return header.equals(pngSignature) || jpegSignature.equals(jpegSig);
}

export async function extractInvoiceData(fileBuffer: Buffer, mimeType?: string): Promise<ExtractedInvoiceData> {
  let text = '';
  let confidence = 100; // Confianza inicial alta si tiene texto

  try {
    // Detectar tipo de archivo
    const isPDFFile = isPDF(fileBuffer);
    const isImageFile = isImage(fileBuffer) || (mimeType && mimeType.startsWith('image/'));

    if (isImageFile) {
      console.log('🖼️ Archivo de imagen detectado, aplicando OCR...');
      const ocrResult = await recognizeImageBuffer(fileBuffer);
      text = ocrResult.text;
      confidence = ocrResult.confidence;
    } else if (isPDFFile) {
      console.log('📄 Archivo PDF detectado, analizando contenido...');

      // Intentar extraer texto directamente del PDF
      let hasText = false;
      let pdfText = '';

      try {
        hasText = await hasExtractableText(fileBuffer);

        if (hasText) {
          console.log('📄 PDF tiene texto extraíble, extrayendo directamente...');
          const pdfResult = await extractTextFromPDFBuffer(fileBuffer);
          pdfText = pdfResult.text;

          if (pdfText && pdfText.trim().length > 30) {
            text = pdfText;
            confidence = 95; // Alta confianza para texto extraído
            console.log(`   ✅ Texto extraído del PDF: ${text.length} caracteres`);
          } else {
            hasText = false; // El texto es muy corto, tratar como escaneado
            console.log('   ⚠️  Texto extraído es muy corto, tratando como PDF escaneado');
          }
        }
      } catch (pdfError: any) {
        console.log(`   ⚠️  Error al extraer texto del PDF: ${pdfError?.message || 'Error desconocido'}`);
        hasText = false;
      }

      // Si no tiene texto o el texto es insuficiente, convertir PDF a imagen y aplicar OCR
      if (!hasText || !text || text.trim().length < 30) {
        console.log('🖼️ PDF sin texto suficiente, convirtiendo a imagen para OCR...');

        try {
          // Convertir la primera página del PDF a imagen
          console.log('   🔄 Convirtiendo PDF a imagen...');
          const imageBuffer = await convertFirstPDFPageToImage(fileBuffer, 2.0);
          console.log(`   ✅ PDF convertido a imagen: ${imageBuffer.length} bytes`);

          // Aplicar OCR en la imagen convertida
          console.log('   🔍 Aplicando OCR en la imagen...');
          const ocrResult = await recognizeImageBuffer(imageBuffer);
          text = ocrResult.text;
          confidence = ocrResult.confidence;
          console.log(`   ✅ OCR completado: ${text.length} caracteres extraídos (confianza: ${confidence.toFixed(1)}%)`);
        } catch (conversionError: any) {
          const errorMessage = conversionError?.message || conversionError?.toString() || 'Error desconocido';
          console.error(`   ❌ Error al procesar PDF escaneado: ${errorMessage}`);

          // Mensaje de error más útil
          throw new Error(
            'No se pudo procesar el PDF escaneado.\n\n' +
            'El sistema intentó convertir el PDF a imagen y aplicar OCR, pero falló.\n\n' +
            'Soluciones alternativas:\n' +
            '1. Convierte manualmente el PDF a imagen (PNG o JPG) y súbelo como imagen\n' +
            '2. Usa un PDF con texto extraíble (no escaneado)\n' +
            '3. Verifica que el PDF no esté corrupto o protegido\n\n' +
            `Error técnico: ${errorMessage}`
          );
        }
      }
    } else {
      throw new Error('Tipo de archivo no soportado. Por favor, suba un PDF o una imagen (PNG, JPG).');
    }

    if (!text || text.trim().length < 50) {
      throw new Error('No se pudo extraer texto suficiente del archivo');
    }

    console.log(`📝 Texto extraído (${text.length} caracteres)`);

    // Parsear el texto para extraer datos estructurados
    return parseInvoiceText(text, confidence);
  } catch (error: any) {
    const errorMessage = error?.message || error?.toString() || String(error) || 'Error desconocido';
    console.error('❌ Error al extraer datos de factura:', error);
    throw new Error(`Error al extraer datos de factura: ${errorMessage}`);
  }
}

/**
 * Parsea texto de factura y extrae datos estructurados
 * @param text Texto de la factura
 * @param confidence Nivel de confianza del OCR
 * @returns Datos estructurados
 */
function parseInvoiceText(text: string, confidence: number): ExtractedInvoiceData {
  const data: ExtractedInvoiceData = {
    items: [],
    confidence
  };

  // Normalizar texto
  const normalizedText = text.replace(/\s+/g, ' ').toUpperCase();

  // Extraer número de factura
  const facturaPatterns = [
    /FACTURA\s*(?:N[O°]?|NRO|NUMERO)?\s*:?\s*([A-Z0-9\-]+)/i,
    /FACT\s*(?:N[O°]?|NRO|NUMERO)?\s*:?\s*([A-Z0-9\-]+)/i,
    /N[O°]?\s*FACTURA\s*:?\s*([A-Z0-9\-]+)/i,
    /(?:FACTURA|FACT)\s*([A-Z0-9\-]{4,})/i
  ];

  for (const pattern of facturaPatterns) {
    const match = normalizedText.match(pattern);
    if (match && match[1]) {
      data.numeroFactura = match[1].trim();
      break;
    }
  }

  // Extraer fecha
  const fechaPatterns = [
    /FECHA\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
    /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/
  ];

  for (const pattern of fechaPatterns) {
    const match = normalizedText.match(pattern);
    if (match && match[1]) {
      data.fecha = normalizeDate(match[1]);
      break;
    }
  }

  // Extraer NIT del proveedor
  const nitPatterns = [
    /NIT\s*:?\s*([0-9]{9,15})/i,
    /N\.I\.T\.\s*:?\s*([0-9]{9,15})/i,
    /IDENTIFICACION\s*:?\s*([0-9]{9,15})/i
  ];

  for (const pattern of nitPatterns) {
    const match = normalizedText.match(pattern);
    if (match && match[1]) {
      data.nitProveedor = match[1].trim();
      break;
    }
  }

  // Extraer nombre del proveedor (líneas después de "RAZON SOCIAL" o similar)
  const razonSocialPatterns = [
    /(?:RAZON\s+SOCIAL|NOMBRE|EMPRESA)\s*:?\s*([A-ZÁÉÍÓÚÑ\s&\.]{5,50})/i,
    /^([A-ZÁÉÍÓÚÑ\s&\.]{10,50})/m
  ];

  for (const pattern of razonSocialPatterns) {
    const match = normalizedText.match(pattern);
    if (match && match[1]) {
      data.nombreProveedor = match[1].trim();
      break;
    }
  }

  // Extraer totales
  const totalPatterns = [
    /TOTAL\s*:?\s*\$?\s*([0-9,\.]+)/i,
    /VALOR\s+TOTAL\s*:?\s*\$?\s*([0-9,\.]+)/i
  ];

  for (const pattern of totalPatterns) {
    const match = normalizedText.match(pattern);
    if (match && match[1]) {
      data.total = parseFloat(match[1].replace(/,/g, ''));
      break;
    }
  }

  // Extraer subtotal
  const subtotalPatterns = [
    /SUBTOTAL\s*:?\s*\$?\s*([0-9,\.]+)/i,
    /BASE\s+GRAVABLE\s*:?\s*\$?\s*([0-9,\.]+)/i
  ];

  for (const pattern of subtotalPatterns) {
    const match = normalizedText.match(pattern);
    if (match && match[1]) {
      data.subtotal = parseFloat(match[1].replace(/,/g, ''));
      break;
    }
  }

  // Extraer IVA
  const ivaPatterns = [
    /IVA\s*:?\s*\$?\s*([0-9,\.]+)/i,
    /IMPUESTO\s+AL\s+VALOR\s+AGREGADO\s*:?\s*\$?\s*([0-9,\.]+)/i
  ];

  for (const pattern of ivaPatterns) {
    const match = normalizedText.match(pattern);
    if (match && match[1]) {
      data.iva = parseFloat(match[1].replace(/,/g, ''));
      break;
    }
  }

  // Extraer items/productos (búsqueda de tablas)
  data.items = extractItemsFromText(text);

  return data;
}

/**
 * Extrae items/productos del texto de la factura
 * @param text Texto completo
 * @returns Array de items
 */
function extractItemsFromText(text: string): ExtractedInvoiceData['items'] {
  const items: ExtractedInvoiceData['items'] = [];

  // Buscar patrones de tabla de productos
  // Formato común: código | descripción | cantidad | precio | total
  const lines = text.split('\n').filter(line => line.trim().length > 10);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Buscar líneas que parezcan productos (tienen números que podrían ser precios)
    const pricePattern = /\$?\s*([0-9,\.]{4,})/g;
    const prices = line.match(pricePattern);

    if (prices && prices.length >= 2) {
      // Posible línea de producto
      const parts = line.split(/\s{2,}|\t/).filter(p => p.trim());

      if (parts.length >= 3) {
        // Intentar extraer datos
        const descripcion = parts[0] || parts.slice(0, -2).join(' ') || 'Producto';
        const cantidad = parseFloat(parts[parts.length - 2]?.replace(/[^0-9,\.]/g, '') || '1');
        const precioUnitario = parseFloat(parts[parts.length - 1]?.replace(/[^0-9,\.]/g, '') || '0');

        if (precioUnitario > 0 && cantidad > 0) {
          const subtotal = cantidad * precioUnitario;
          items.push({
            descripcion: descripcion.trim(),
            cantidad: isNaN(cantidad) ? 1 : cantidad,
            precioUnitario: isNaN(precioUnitario) ? 0 : precioUnitario,
            subtotal: isNaN(subtotal) ? 0 : subtotal,
            total: subtotal,
            iva: 0
          });
        }
      }
    }
  }

  // Si no encontramos items con el método anterior, buscar patrones más simples
  if (items.length === 0) {
    // Buscar líneas con formato: descripción cantidad precio
    const simplePattern = /^([A-ZÁÉÍÓÚÑ\s]{10,})\s+([0-9,\.]+)\s+\$?\s*([0-9,\.]+)/i;

    for (const line of lines) {
      const match = line.match(simplePattern);
      if (match) {
        const descripcion = match[1].trim();
        const cantidad = parseFloat(match[2].replace(/,/g, ''));
        const precioUnitario = parseFloat(match[3].replace(/,/g, ''));

        if (!isNaN(cantidad) && !isNaN(precioUnitario) && precioUnitario > 0) {
          items.push({
            descripcion,
            cantidad,
            precioUnitario,
            subtotal: cantidad * precioUnitario,
            total: cantidad * precioUnitario,
            iva: 0
          });
        }
      }
    }
  }

  return items;
}

/**
 * Normaliza una fecha a formato YYYY-MM-DD
 */
function normalizeDate(dateStr: string): string {
  // Intentar diferentes formatos
  const formats = [
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/, // DD/MM/YYYY o DD-MM-YYYY
    /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/, // YYYY/MM/DD o YYYY-MM-DD
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})/  // DD/MM/YY o DD-MM-YY
  ];

  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      let day, month, year;

      if (match[1].length === 4) {
        // Formato YYYY-MM-DD
        year = match[1];
        month = match[2].padStart(2, '0');
        day = match[3].padStart(2, '0');
      } else {
        // Formato DD/MM/YYYY o DD/MM/YY
        day = match[1].padStart(2, '0');
        month = match[2].padStart(2, '0');
        year = match[3].length === 2 ? `20${match[3]}` : match[3];
      }

      return `${year}-${month}-${day}`;
    }
  }

  return dateStr; // Retornar original si no se puede parsear
}

