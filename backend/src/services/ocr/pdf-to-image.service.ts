/**
 * Servicio para convertir páginas de PDF a imágenes
 */
// pdfjs-dist es un módulo ES, necesitamos importación dinámica
import { createCanvas, CanvasRenderingContext2D } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Variable para almacenar el módulo pdfjs-dist cargado dinámicamente
let pdfjsLib: any = null;

/**
 * Carga dinámicamente pdfjs-dist (módulo ES)
 * Usa Function constructor para evitar que TypeScript lo convierta a require()
 */
async function loadPdfJs(): Promise<any> {
  if (!pdfjsLib) {
    try {
      console.log('   📦 Cargando pdfjs-dist...');

      // Usar Function constructor para forzar import() dinámico real en tiempo de ejecución
      // Esto evita que TypeScript lo convierta a require()
      const dynamicImport = new Function('specifier', 'return import(specifier)');

      // Intentar diferentes rutas
      let pdfjsModule: any = null;
      const pathsToTry = [
        'pdfjs-dist/legacy/build/pdf.mjs',
        'pdfjs-dist/build/pdf.mjs',
        'pdfjs-dist'
      ];

      for (const path of pathsToTry) {
        try {
          console.log(`   🔍 Intentando cargar desde: ${path}`);
          pdfjsModule = await dynamicImport(path);
          console.log(`   ✅ Cargado desde: ${path}`);
          break;
        } catch (pathError: any) {
          console.log(`   ⚠️  Falló ${path}: ${pathError?.message || 'Error desconocido'}`);
          continue;
        }
      }

      if (!pdfjsModule) {
        throw new Error('No se pudo cargar pdfjs-dist desde ninguna ruta disponible');
      }

      // Acceder al módulo correcto (puede estar en .default o directamente)
      if (pdfjsModule.default) {
        pdfjsLib = pdfjsModule.default;
      } else if (pdfjsModule.getDocument) {
        pdfjsLib = pdfjsModule;
      } else {
        // Intentar acceder a propiedades comunes
        pdfjsLib = pdfjsModule;
      }

      console.log('   ✅ pdfjs-dist cargado correctamente');

      // Configurar el worker (opcional, puede fallar)
      try {
        if (pdfjsLib && pdfjsLib.GlobalWorkerOptions) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdfjs-dist/legacy/build/pdf.worker.mjs';
        }
      } catch (error) {
        // No crítico, continuamos sin worker
        console.warn('⚠️  No se pudo configurar el worker de pdfjs-dist, continuando sin él');
      }
    } catch (error: any) {
      const errorMsg = error?.message || error?.toString() || 'Error desconocido';
      console.error(`   ❌ Error al cargar pdfjs-dist: ${errorMsg}`);
      console.error(`   Stack: ${error?.stack || 'No disponible'}`);
      throw new Error(`Error al cargar pdfjs-dist: ${errorMsg}`);
    }
  }
  return pdfjsLib;
}

export interface PDFPageImage {
  pageNumber: number;
  imageBuffer: Buffer;
  width: number;
  height: number;
}

/**
 * Convierte una página de PDF a imagen PNG
 * @param pdfBuffer Buffer del archivo PDF
 * @param pageNumber Número de página (1-indexed)
 * @param scaleFactor Factor de escala para la imagen (default: 2.0 para mejor calidad OCR)
 * @returns Buffer de la imagen PNG
 */
export async function convertPDFPageToImage(
  pdfBuffer: Buffer,
  pageNumber: number = 1,
  scaleFactor: number = 2.0
): Promise<PDFPageImage> {
  try {
    console.log(`   📄 Cargando PDF (página ${pageNumber})...`);

    // Cargar pdfjs-dist dinámicamente
    const pdfjs = await loadPdfJs();

    // Convertir Buffer a Uint8Array (pdfjs-dist requiere Uint8Array, no Buffer)
    const uint8Array = new Uint8Array(pdfBuffer);

    // Cargar el documento PDF
    const loadingTask = pdfjs.getDocument({
      data: uint8Array,
      verbosity: 0 // Reducir logs
    });

    const pdfDocument = await loadingTask.promise;
    const numPages = pdfDocument.numPages;

    if (pageNumber < 1 || pageNumber > numPages) {
      throw new Error(`Número de página inválido: ${pageNumber}. El PDF tiene ${numPages} página(s).`);
    }

    console.log(`   📄 PDF cargado: ${numPages} página(s)`);

    // Obtener la página
    const page = await pdfDocument.getPage(pageNumber);
    const viewport = page.getViewport({ scale: scaleFactor });

    console.log(`   📐 Dimensiones de página: ${viewport.width}x${viewport.height}px (escala: ${scaleFactor}x)`);

    // Crear canvas
    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext('2d') as CanvasRenderingContext2D;

    // Renderizar la página en el canvas
    console.log(`   🎨 Renderizando página ${pageNumber}...`);
    const renderContext = {
      canvasContext: context,
      viewport: viewport,
      canvas: canvas
    };

    await page.render(renderContext).promise;
    console.log(`   ✅ Página renderizada`);

    // Convertir canvas a buffer PNG
    const imageBuffer = canvas.toBuffer('image/png');
    console.log(`   💾 Imagen generada: ${imageBuffer.length} bytes`);

    return {
      pageNumber,
      imageBuffer,
      width: viewport.width,
      height: viewport.height
    };
  } catch (error: any) {
    const errorMessage = error?.message || error?.toString() || 'Error desconocido';
    console.error(`   ❌ Error al convertir PDF a imagen: ${errorMessage}`);
    throw new Error(`Error al convertir PDF a imagen: ${errorMessage}`);
  }
}

/**
 * Convierte todas las páginas de un PDF a imágenes
 * @param pdfBuffer Buffer del archivo PDF
 * @param scaleFactor Factor de escala para las imágenes (default: 2.0)
 * @returns Array de imágenes de las páginas
 */
export async function convertPDFToImages(
  pdfBuffer: Buffer,
  scaleFactor: number = 2.0
): Promise<PDFPageImage[]> {
  try {
    console.log(`📄 Convirtiendo PDF a imágenes...`);

    // Cargar pdfjs-dist dinámicamente
    const pdfjs = await loadPdfJs();

    // Convertir Buffer a Uint8Array (pdfjs-dist requiere Uint8Array, no Buffer)
    const uint8Array = new Uint8Array(pdfBuffer);

    // Cargar el documento para obtener el número de páginas
    const loadingTask = pdfjs.getDocument({
      data: uint8Array,
      verbosity: 0
    });

    const pdfDocument = await loadingTask.promise;
    const numPages = pdfDocument.numPages;

    console.log(`   📄 PDF tiene ${numPages} página(s)`);

    const images: PDFPageImage[] = [];

    // Convertir cada página
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      console.log(`   📄 Procesando página ${pageNum}/${numPages}...`);
      const image = await convertPDFPageToImage(pdfBuffer, pageNum, scaleFactor);
      images.push(image);
    }

    console.log(`✅ PDF convertido: ${images.length} imagen(es) generada(s)`);

    return images;
  } catch (error: any) {
    const errorMessage = error?.message || error?.toString() || 'Error desconocido';
    console.error(`❌ Error al convertir PDF a imágenes: ${errorMessage}`);
    throw new Error(`Error al convertir PDF a imágenes: ${errorMessage}`);
  }
}

/**
 * Convierte la primera página de un PDF a imagen (útil para facturas de una página)
 * @param pdfBuffer Buffer del archivo PDF
 * @param scaleFactor Factor de escala (default: 2.0)
 * @returns Buffer de la imagen PNG de la primera página
 */
export async function convertFirstPDFPageToImage(
  pdfBuffer: Buffer,
  scaleFactor: number = 2.0
): Promise<Buffer> {
  const result = await convertPDFPageToImage(pdfBuffer, 1, scaleFactor);
  return result.imageBuffer;
}

