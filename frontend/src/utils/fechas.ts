/**
 * Utilidades para manejo de fechas en zona horaria local (Bogotá, Colombia)
 */

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD en zona horaria local
 * (sin usar UTC para evitar problemas de cambio de día)
 * @returns String en formato YYYY-MM-DD
 */
export function getFechaHoyLocal(): string {
  const ahora = new Date();
  const year = ahora.getFullYear();
  const month = String(ahora.getMonth() + 1).padStart(2, '0');
  const day = String(ahora.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formatea una fecha a formato YYYY-MM-DD en zona horaria local
 * @param fecha Fecha a formatear (Date, string ISO, o string YYYY-MM-DD)
 * @returns String en formato YYYY-MM-DD
 */
export function formatearFechaLocal(fecha: Date | string): string {
  let date: Date;

  if (typeof fecha === 'string') {
    // Si ya está en formato YYYY-MM-DD, retornarlo directamente
    if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return fecha;
    }
    date = new Date(fecha);
  } else {
    date = fecha;
  }

  // Usar métodos locales para evitar problemas con UTC
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Convierte una fecha string (YYYY-MM-DD) a objeto Date en zona horaria local
 * @param fechaString String en formato YYYY-MM-DD
 * @returns Date object en zona horaria local
 */
export function parsearFechaLocal(fechaString: string): Date {
  const [year, month, day] = fechaString.split('-').map(Number);
  // new Date(year, month, day) usa zona horaria local
  return new Date(year, month - 1, day);
}

