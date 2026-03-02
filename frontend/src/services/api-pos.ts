/**
 * Servicios API para Punto de Venta (POS)
 */
// Obtener URL de la API
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export interface ConfiguracionPOS {
  bloquearModificacionPrecio: boolean;
  bloquearModificacionIVA: boolean;
  bloquearModificacionTotal: boolean;
  permitirDescuentos: boolean;
  porcentajeDescuentoMaximo: number | null;
  usarCodigoBarras: boolean;
  mostrarStock: boolean;
  validarStock: boolean;
  requerirCliente: boolean;
  clientePorDefecto: number | null;
  vendedorPorDefecto: number | null;
  idEmpresa: number;
}

export interface DetalleVentaPOS {
  idProducto: number;
  codigoBarras?: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  iva: number;
  descuento?: number;
  subtotal: number;
  total: number;
}

// Detalle simplificado para enviar al backend
export interface DetalleVentaRequest {
  idProducto: number;
  cantidad: number;
  precioUnitario: number;
  iva: number;
  descuento?: number;
}

export interface VentaRapidaRequest {
  fecha: string;
  idCliente?: number;
  idVendedor?: number;
  idEmpresa?: number;
  detalles: DetalleVentaRequest[];
  idUsuarioCreacion?: number;
}

export const posService = {
  /**
   * Obtener configuración del POS
   */
  async obtenerConfiguracion(idEmpresa?: number): Promise<ConfiguracionPOS> {
    try {
      const params = idEmpresa ? `?idEmpresa=${idEmpresa}` : '';
      const url = `${API_URL}/api/pos/configuracion${params}`;
      console.log('🔍 Solicitando configuración POS desde:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error en respuesta del servidor:', response.status, errorText);
        throw new Error(`Error al obtener configuración POS: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Configuración POS recibida:', data);
      return data;
    } catch (error: any) {
      console.error('❌ Error en obtenerConfiguracion:', error);
      throw error;
    }
  },

  /**
   * Actualizar configuración del POS
   */
  async actualizarConfiguracion(config: ConfiguracionPOS & { idUsuarioModificacion?: number }): Promise<{ success: boolean; mensaje: string }> {
    const response = await fetch(`${API_URL}/api/pos/configuracion`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(config)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.mensaje || 'Error al actualizar configuración POS');
    }

    return await response.json();
  },

  /**
   * Realizar venta rápida desde POS
   */
  async realizarVentaRapida(venta: VentaRapidaRequest): Promise<{ success: boolean; idFactura: number; numeroFactura: string; total: number; mensaje: string }> {
    const response = await fetch(`${API_URL}/api/pos/venta-rapida`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(venta)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.mensaje || 'Error al realizar venta rápida');
    }

    return await response.json();
  }
};

