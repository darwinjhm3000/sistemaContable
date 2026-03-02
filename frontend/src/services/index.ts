/**
 * Servicios API - Punto de entrada centralizado
 *
 * Este archivo exporta todos los servicios disponibles para interactuar con la API del backend.
 *
 * Uso:
 * ```typescript
 * import { api } from '../services';
 * // o
 * import api from '../services';
 *
 * // Ejemplo de uso:
 * const cuentas = await api.puc.obtenerCuentas();
 * const terceros = await api.terceros.obtenerTerceros();
 * ```
 */

// Exportar el objeto api principal y todos los servicios individuales
export {
  api,
  authService,
  pucService,
  tercerosService,
  clientesService,
  asientosService,
  healthService,
  ApiException
} from './api';

// Exportar por defecto el objeto api
export { default } from './api';

