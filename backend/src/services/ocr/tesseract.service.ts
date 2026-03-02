/**
 * Servicio para OCR usando Tesseract.js
 */
import { createWorker, Worker } from 'tesseract.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface OCRResult {
  text: string;
  confidence: number;
  words: Array<{
    text: string;
    bbox: { x0: number; y0: number; x1: number; y1: number };
    confidence: number;
  }>;
}

let worker: Worker | null = null;

/**
 * Inicializa el worker de Tesseract
 */
async function initializeWorker(): Promise<Worker> {
  if (!worker) {
    try {
      console.log('🔧 Inicializando worker de Tesseract.js...');
      console.log('   Idioma: español (spa)');
      console.log('   Nivel de OCR: 1 (LSTM OCR Engine)');

      worker = await createWorker('spa', 1, {
        logger: (m: any) => {
          // Loggear progreso importante
          if (m.status === 'loading tesseract core') {
            console.log('   📦 Cargando núcleo de Tesseract...');
          } else if (m.status === 'initializing tesseract') {
            console.log('   🔄 Inicializando Tesseract...');
          } else if (m.status === 'loading language traineddata') {
            console.log(`   📚 Cargando datos de idioma: ${m.progress || '...'}`);
          } else if (m.status === 'initializing api') {
            console.log('   🔌 Inicializando API...');
          } else if (m.status === 'recognizing text') {
            const progress = m.progress ? ` (${(m.progress * 100).toFixed(0)}%)` : '';
            if (m.progress === 1) {
              console.log('   ✅ OCR completado');
            } else if (m.progress && m.progress > 0) {
              console.log(`   🔍 Reconociendo texto${progress}...`);
            }
          }

          // Loggear errores
          if (m.status === 'error' || m.error) {
            console.error('   ❌ Error en Tesseract:', m.error || m);
          }
        }
      });

      console.log('✅ Worker de Tesseract inicializado correctamente');
    } catch (error: any) {
      console.error('❌ Error al inicializar worker de Tesseract:', error);
      const errorMessage = error?.message || error?.toString() || String(error) || 'Error desconocido';
      throw new Error(`Error al inicializar Tesseract: ${errorMessage}`);
    }
  }
  return worker;
}

/**
 * Realiza OCR en una imagen
 * @param imagePath Ruta de la imagen
 * @param language Idioma para OCR (default: 'spa')
 * @returns Texto reconocido
 */
export async function recognizeImage(
  imagePath: string,
  language: string = 'spa'
): Promise<OCRResult> {
  let workerInstance: Worker | null = null;

  try {
    // Verificar que el archivo existe
    if (!fs.existsSync(imagePath)) {
      throw new Error(`El archivo no existe: ${imagePath}`);
    }

    const fileStats = fs.statSync(imagePath);
    if (fileStats.size === 0) {
      throw new Error(`El archivo está vacío: ${imagePath}`);
    }

    console.log(`🔍 Iniciando OCR en: ${imagePath}`);
    console.log(`   Tamaño del archivo: ${fileStats.size} bytes`);
    console.log(`   Idioma: ${language}`);

    // Inicializar worker con manejo de errores mejorado
    try {
      workerInstance = await initializeWorker();
      if (!workerInstance) {
        throw new Error('No se pudo inicializar el worker de Tesseract');
      }
    } catch (initError: any) {
      const initErrorMessage = initError?.message || initError?.toString() || String(initError) || 'Error desconocido al inicializar';
      console.error('❌ Error al inicializar worker:', initError);
      throw new Error(`Error al inicializar Tesseract: ${initErrorMessage}`);
    }

    console.log('   ⏳ Procesando imagen con OCR...');
    const startTime = Date.now();

    const result = await workerInstance.recognize(imagePath);
    const processingTime = Date.now() - startTime;

    console.log(`   ⏱️  Tiempo de procesamiento: ${processingTime}ms`);

    if (!result || !result.data) {
      throw new Error('El resultado de OCR está vacío o es inválido');
    }

    const text = result.data.text || '';
    // Acceder a words correctamente según la API de Tesseract.js
    const words = (result.data as any).words || [];

    console.log(`   📝 Texto extraído: ${text.length} caracteres`);
    console.log(`   🔤 Palabras encontradas: ${words.length}`);

    if (text.trim().length === 0) {
      console.warn('   ⚠️  No se extrajo texto de la imagen');
    }

    // Calcular confianza promedio
    const confidence = words.length > 0
      ? words.reduce((sum: number, w: any) => sum + (w.confidence || 0), 0) / words.length
      : text.length > 0 ? 50 : 0; // Si hay texto pero no palabras, dar confianza media

    console.log(`   📊 Confianza promedio: ${confidence.toFixed(2)}%`);

    return {
      text: text.trim(),
      confidence,
      words: words.map((w: any) => ({
        text: w.text || '',
        bbox: w.bbox || { x0: 0, y0: 0, x1: 0, y1: 0 },
        confidence: w.confidence || 0
      }))
    };
  } catch (error: any) {
    // Capturar información detallada del error
    let errorMessage = 'Error desconocido en OCR';
    let errorDetails: any = null;

    if (error) {
      if (error.message) {
        errorMessage = error.message;
        errorDetails = {
          message: error.message,
          stack: error.stack,
          name: error.name,
          code: (error as any).code
        };
      } else if (error.toString && typeof error.toString === 'function') {
        errorMessage = error.toString();
        errorDetails = { error: error };
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else {
        try {
          errorMessage = JSON.stringify(error);
          errorDetails = error;
        } catch {
          errorMessage = 'Error no serializable';
        }
      }
    }

    console.error('❌ Error en OCR:', {
      message: errorMessage,
      details: errorDetails,
      imagePath: imagePath,
      language: language,
      workerInitialized: !!workerInstance
    });

    throw new Error(`Error en OCR: ${errorMessage}`);
  }
}

/**
 * Realiza OCR en un buffer de imagen
 * @param imageBuffer Buffer de la imagen
 * @param language Idioma para OCR (default: 'spa')
 * @returns Texto reconocido
 */
export async function recognizeImageBuffer(
  imageBuffer: Buffer,
  language: string = 'spa'
): Promise<OCRResult> {
  let tempPath: string | null = null;

  try {
    // Validar que el buffer no esté vacío
    if (!imageBuffer || imageBuffer.length === 0) {
      throw new Error('El buffer de imagen está vacío');
    }

    console.log(`📦 Buffer recibido: ${imageBuffer.length} bytes`);

    // Crear archivo temporal
    const tempDir = os.tmpdir();
    tempPath = path.join(tempDir, `ocr-${Date.now()}-${Math.random().toString(36).substring(7)}.png`);

    console.log(`💾 Guardando archivo temporal: ${tempPath}`);
    fs.writeFileSync(tempPath, imageBuffer);

    // Verificar que el archivo se creó correctamente
    if (!fs.existsSync(tempPath)) {
      throw new Error('No se pudo crear el archivo temporal');
    }

    const fileStats = fs.statSync(tempPath);
    console.log(`   Archivo creado: ${fileStats.size} bytes`);

    try {
      const result = await recognizeImage(tempPath, language);
      return result;
    } finally {
      // Limpiar archivo temporal
      if (tempPath && fs.existsSync(tempPath)) {
        try {
          fs.unlinkSync(tempPath);
          console.log(`🗑️ Archivo temporal eliminado: ${tempPath}`);
        } catch (unlinkError) {
          console.warn(`⚠️ No se pudo eliminar archivo temporal: ${tempPath}`, unlinkError);
        }
      }
    }
  } catch (error: any) {
    // Capturar información detallada del error
    let errorMessage = 'Error desconocido en OCR desde buffer';
    if (error) {
      if (error.message) {
        errorMessage = error.message;
      } else if (error.toString && typeof error.toString === 'function') {
        errorMessage = error.toString();
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else {
        try {
          errorMessage = JSON.stringify(error);
        } catch {
          errorMessage = 'Error no serializable';
        }
      }
    }

    console.error('❌ Error en OCR desde buffer:', {
      message: errorMessage,
      error: error,
      stack: error?.stack,
      bufferSize: imageBuffer?.length || 0,
      tempPath: tempPath,
      language: language
    });

    // Limpiar archivo temporal en caso de error
    if (tempPath && fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
      } catch (unlinkError) {
        // Ignorar errores al limpiar
      }
    }

    throw new Error(`Error en OCR desde buffer: ${errorMessage}`);
  }
}

/**
 * Cierra el worker de Tesseract (liberar recursos)
 */
export async function terminateWorker(): Promise<void> {
  if (worker) {
    await worker.terminate();
    worker = null;
  }
}

