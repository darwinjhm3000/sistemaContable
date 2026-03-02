/**
 * Servicio para extraer texto de archivos PDF
 */
// NOTA: El polyfill de DOMMatrix se aplica en server.ts antes de cualquier importación
const pdfParse = require('pdf-parse');
import * as fs from 'fs';

export interface PDFTextResult {
  text: string;
  numPages: number;
  info: any;
  metadata: any;
}

/**
 * Extrae texto de un archivo PDF
 * @param filePath Ruta del archivo PDF
 * @returns Texto extraído del PDF
 */
export async function extractTextFromPDF(filePath: string): Promise<PDFTextResult> {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(dataBuffer);

    return {
      text: pdfData.text,
      numPages: pdfData.numpages,
      info: pdfData.info,
      metadata: pdfData.metadata
    };
  } catch (error: any) {
    throw new Error(`Error al extraer texto del PDF: ${error.message}`);
  }
}

/**
 * Extrae texto de un buffer PDF
 * @param buffer Buffer del archivo PDF
 * @returns Texto extraído del PDF
 */
export async function extractTextFromPDFBuffer(buffer: Buffer): Promise<PDFTextResult> {
  try {
    // pdf-parse se importa con require(), no necesita .default
    const pdfData = await pdfParse(buffer);

    return {
      text: pdfData.text,
      numPages: pdfData.numpages,
      info: pdfData.info,
      metadata: pdfData.metadata
    };
  } catch (error: any) {
    throw new Error(`Error al extraer texto del PDF: ${error.message}`);
  }
}

/**
 * Verifica si un PDF tiene texto extraíble
 * @param buffer Buffer del archivo PDF
 * @returns true si tiene texto, false si está escaneado
 */
export async function hasExtractableText(buffer: Buffer): Promise<boolean> {
  try {
    // pdf-parse se importa con require(), no necesita .default
    const pdfData = await pdfParse(buffer);
    const textLength = pdfData.text.trim().length;

    console.log(`   📊 Análisis de PDF:`);
    console.log(`      Páginas: ${pdfData.numpages || 0}`);
    console.log(`      Texto extraído: ${textLength} caracteres`);

    // Si el texto tiene más de 30 caracteres, consideramos que tiene texto
    // Reducido de 50 a 30 para ser más permisivo
    const hasText = textLength > 30;

    if (!hasText && textLength > 0) {
      console.log(`      ⚠️  Texto muy corto (${textLength} caracteres), puede ser PDF escaneado`);
    }

    return hasText;
  } catch (error: any) {
    console.log(`   ❌ Error al analizar PDF: ${error?.message || 'Error desconocido'}`);
    // Si hay error al parsear, asumimos que es PDF escaneado
    return false;
  }
}

