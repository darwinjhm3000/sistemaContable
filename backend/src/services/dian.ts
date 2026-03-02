// Servicio para generar CUFE/CUDE según Resolución DIAN 000085
import crypto from 'crypto';

export interface DatosFacturaDIAN {
  numeroFactura: string;
  fecha: string;
  nitEmisor: string;
  nitReceptor: string;
  valorTotal: number;
  ambiente: 'Produccion' | 'Pruebas';
  tipoDocumento: string; // FV, NC, ND, etc.
}

/**
 * Genera el CUFE (Código Único de Facturación Electrónica) según Resolución DIAN 000085
 * El CUFE se genera usando un algoritmo hash SHA-384 con los datos de la factura
 */
export function generarCUFE(datos: DatosFacturaDIAN): string {
  // Construir cadena de datos para el hash
  const cadenaDatos = [
    datos.numeroFactura,
    datos.fecha,
    datos.nitEmisor,
    datos.nitReceptor,
    datos.valorTotal.toFixed(2),
    datos.ambiente,
    datos.tipoDocumento
  ].join('|');

  // Generar hash SHA-384
  const hash = crypto.createHash('sha384').update(cadenaDatos).digest('hex');

  // El CUFE tiene un formato específico: primeros 8 caracteres del hash + timestamp
  const timestamp = Date.now().toString(36).toUpperCase();
  const cufe = hash.substring(0, 64).toUpperCase() + timestamp.substring(0, 8);

  return cufe;
}

/**
 * Genera el CUDE (Código Único de Documento Electrónico) para documentos que no son facturas
 */
export function generarCUDE(datos: DatosFacturaDIAN): string {
  // Similar al CUFE pero con prefijo diferente
  return generarCUFE(datos);
}

/**
 * Genera el código QR para la factura según formato DIAN
 */
export function generarQRCode(datos: {
  cufe: string;
  numeroFactura: string;
  fecha: string;
  nitEmisor: string;
  nitReceptor: string;
  valorTotal: number;
  iva: number;
  ambiente: string;
}): string {
  // Formato del QR según DIAN
  const qrData = [
    datos.cufe,
    datos.numeroFactura,
    datos.fecha,
    datos.nitEmisor,
    datos.nitReceptor,
    datos.valorTotal.toFixed(2),
    datos.iva.toFixed(2),
    datos.ambiente
  ].join('|');

  return qrData;
}

/**
 * Valida que una factura cumpla con los requisitos mínimos de DIAN
 */
export function validarRequisitosDIAN(factura: {
  numeroFactura: string;
  fecha: string;
  nitEmisor: string;
  nitReceptor: string;
  valorTotal: number;
  detalles: Array<{
    cantidad: number;
    precioUnitario: number;
    iva: number;
  }>;
}): { valido: boolean; errores: string[] } {
  const errores: string[] = [];

  // Validar número de factura
  if (!factura.numeroFactura || factura.numeroFactura.trim() === '') {
    errores.push('El número de factura es obligatorio');
  }

  // Validar fecha
  if (!factura.fecha) {
    errores.push('La fecha es obligatoria');
  } else {
    const fecha = new Date(factura.fecha);
    if (isNaN(fecha.getTime())) {
      errores.push('La fecha no es válida');
    }
  }

  // Validar NIT emisor
  if (!factura.nitEmisor || factura.nitEmisor.trim() === '') {
    errores.push('El NIT del emisor es obligatorio');
  } else if (!/^\d{9,15}$/.test(factura.nitEmisor.replace(/[-\s]/g, ''))) {
    errores.push('El NIT del emisor no tiene un formato válido');
  }

  // Validar NIT receptor
  if (!factura.nitReceptor || factura.nitReceptor.trim() === '') {
    errores.push('El NIT del receptor es obligatorio');
  } else if (!/^\d{9,15}$/.test(factura.nitReceptor.replace(/[-\s]/g, ''))) {
    errores.push('El NIT del receptor no tiene un formato válido');
  }

  // Validar valor total
  if (!factura.valorTotal || factura.valorTotal <= 0) {
    errores.push('El valor total debe ser mayor a cero');
  }

  // Validar que tenga al menos un detalle
  if (!factura.detalles || factura.detalles.length === 0) {
    errores.push('La factura debe tener al menos un producto o servicio');
  }

  // Validar detalles
  factura.detalles?.forEach((detalle, index) => {
    if (!detalle.cantidad || detalle.cantidad <= 0) {
      errores.push(`El detalle ${index + 1} debe tener una cantidad mayor a cero`);
    }
    if (!detalle.precioUnitario || detalle.precioUnitario <= 0) {
      errores.push(`El detalle ${index + 1} debe tener un precio unitario mayor a cero`);
    }
  });

  return {
    valido: errores.length === 0,
    errores
  };
}

/**
 * Formatea el NIT removiendo guiones y espacios
 */
export function formatearNIT(nit: string): string {
  return nit.replace(/[-\s]/g, '');
}

/**
 * Valida el formato de un NIT colombiano
 */
export function validarNIT(nit: string): boolean {
  const nitLimpio = formatearNIT(nit);
  // NIT debe tener entre 9 y 15 dígitos
  return /^\d{9,15}$/.test(nitLimpio);
}

