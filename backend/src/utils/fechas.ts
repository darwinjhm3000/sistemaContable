/**
 * Utilidades para manejo de fechas en zona horaria de Bogotá, Colombia
 * Zona horaria: America/Bogota (UTC-5)
 */

/**
 * Obtiene la fecha y hora actual en zona horaria de Bogotá
 * @returns Fecha actual en formato ISO string
 */
export function getFechaActualBogota(): Date {
  // Node.js usa la zona horaria del sistema por defecto
  // Si el sistema está configurado con SA Pacific Standard Time, ya está correcto
  return new Date();
}

/**
 * Formatea una fecha a formato YYYY-MM-DD en zona horaria de Bogotá
 * @param fecha Fecha a formatear
 * @returns String en formato YYYY-MM-DD
 */
export function formatearFechaBogota(fecha: Date | string): string {
  let date: Date;

  if (typeof fecha === 'string') {
    date = new Date(fecha);
  } else {
    date = fecha;
  }

  // Asegurar que usamos la zona horaria local (Bogotá)
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD (Bogotá)
 * @returns String en formato YYYY-MM-DD
 */
export function getFechaHoyBogota(): string {
  return formatearFechaBogota(new Date());
}

/**
 * Obtiene la fecha y hora actual en formato ISO con zona horaria de Bogotá
 * @returns String en formato ISO con offset -05:00
 */
export function getFechaHoraActualBogota(): string {
  const now = new Date();
  const offset = -5 * 60; // UTC-5 en minutos
  const localTime = now.getTime() - (now.getTimezoneOffset() * 60000);
  const bogotaTime = new Date(localTime + (offset * 60000));

  return bogotaTime.toISOString().replace('Z', '-05:00');
}

/**
 * Convierte una fecha UTC a zona horaria de Bogotá
 * @param fechaUTC Fecha en UTC
 * @returns Fecha en zona horaria de Bogotá
 */
export function convertirUTCABogota(fechaUTC: Date | string): Date {
  const date = typeof fechaUTC === 'string' ? new Date(fechaUTC) : fechaUTC;
  const offset = -5 * 60; // UTC-5 en minutos
  const localTime = date.getTime() - (date.getTimezoneOffset() * 60000);
  return new Date(localTime + (offset * 60000));
}

/**
 * Valida que una fecha esté en formato válido
 * @param fecha String de fecha
 * @returns true si es válida, false si no
 */
export function validarFecha(fecha: string): boolean {
  const date = new Date(fecha);
  return !isNaN(date.getTime());
}

/**
 * Obtiene información de la zona horaria actual
 * @returns Objeto con información de la zona horaria
 */
export function getInfoZonaHoraria(): {
  zonaHoraria: string;
  offset: string;
  fechaActual: string;
  fechaHoraActual: string;
} {
  const now = new Date();
  const offset = -now.getTimezoneOffset() / 60; // Offset en horas
  const offsetStr = offset >= 0 ? `+${offset}` : `${offset}`;

  return {
    zonaHoraria: 'America/Bogota (UTC-5)',
    offset: `UTC${offsetStr}`,
    fechaActual: getFechaHoyBogota(),
    fechaHoraActual: now.toLocaleString('es-CO', { timeZone: 'America/Bogota' })
  };
}

