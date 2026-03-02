// Servicio centralizado para llamadas a la API
import {
  LoginRequest,
  LoginResponse,
  CuentaPUC,
  Tercero,
  Cliente,
  AsientoContable
} from '../types';
import { posService } from './api-pos';

// Obtener URL de la API desde variables de entorno o usar valor por defecto
// En React, las variables de entorno están disponibles en process.env
declare const process: {
  env: {
    REACT_APP_API_URL?: string;
  };
};

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Interfaz para respuestas de error
interface ApiError {
  error?: string;
  mensaje?: string;
  detalles?: string;
}

// Clase para manejar errores de API
export class ApiException extends Error {
  constructor(
    message: string,
    public status?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiException';
  }
}

// Función auxiliar para obtener el token
const getToken = (): string | null => {
  return localStorage.getItem('token');
};

// Función auxiliar para hacer peticiones HTTP
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  // Agregar token de autenticación si existe
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    // Si la respuesta no es exitosa, manejar el error
    if (!response.ok) {
      let errorMessage = `Error ${response.status}: ${response.statusText}`;
      let errorDetails: any = null;

      try {
        const errorData: ApiError = await response.json();
        errorMessage = errorData.error || errorData.mensaje || errorMessage;
        errorDetails = errorData;
      } catch {
        // Si no se puede parsear el JSON, usar el mensaje por defecto
      }

      // Si es un error de autenticación, limpiar el token
      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        // Redirigir al login si estamos en el navegador
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }

      throw new ApiException(errorMessage, response.status, errorDetails);
    }

    // Si la respuesta está vacía, retornar null
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return null as T;
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiException) {
      throw error;
    }

    // Error de red u otro error
    throw new ApiException(
      'Error de conexión con el servidor',
      0,
      error
    );
  }
}

// =============================================
// Servicios de Autenticación
// =============================================
export const authService = {
  /**
   * Iniciar sesión
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await request<LoginResponse>('/api/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (response.success && response.token && response.usuario) {
      // Guardar token, usuario y empresa en localStorage
      localStorage.setItem('token', response.token);
      localStorage.setItem('usuario', JSON.stringify(response.usuario));
      if (response.empresa) {
        localStorage.setItem('empresa', JSON.stringify(response.empresa));
      }
    }

    return response;
  },

  /**
   * Cerrar sesión
   */
  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
  },

  /**
   * Verificar si el usuario está autenticado
   */
  isAuthenticated(): boolean {
    return !!getToken();
  },

  /**
   * Obtener el usuario actual
   */
  getCurrentUser() {
    const usuarioStr = localStorage.getItem('usuario');
    return usuarioStr ? JSON.parse(usuarioStr) : null;
  },

  /**
   * Obtener la empresa actual
   */
  getCurrentEmpresa() {
    const empresaStr = localStorage.getItem('empresa');
    return empresaStr ? JSON.parse(empresaStr) : null;
  },
};

// =============================================
// Servicios de PUC (Plan Único de Cuentas)
// =============================================
export const pucService = {
  /**
   * Obtener todas las cuentas del PUC
   * @param nivel - Filtrar por nivel (opcional)
   * @param codigoPadre - Filtrar por código padre (opcional)
   */
  async obtenerCuentas(
    nivel?: number,
    codigoPadre?: string
  ): Promise<CuentaPUC[]> {
    const params = new URLSearchParams();
    if (nivel !== undefined) {
      params.append('nivel', nivel.toString());
    }
    if (codigoPadre) {
      params.append('codigoPadre', codigoPadre);
    }

    const queryString = params.toString();
    const endpoint = `/api/puc${queryString ? `?${queryString}` : ''}`;

    return await request<CuentaPUC[]>(endpoint);
  },
};

// =============================================
// Servicios de Terceros
// =============================================
export const tercerosService = {
  /**
   * Obtener todos los terceros activos
   */
  async obtenerTerceros(): Promise<Tercero[]> {
    return await request<Tercero[]>('/api/terceros');
  },
};

// =============================================
// Servicios de Clientes
// =============================================
export const clientesService = {
  /**
   * Obtener todos los clientes
   */
  async obtenerClientes(filtros?: {
    activo?: boolean;
    buscar?: string;
    ciudad?: string;
    tipoPersona?: 'N' | 'J';
  }): Promise<any[]> {
    const params = new URLSearchParams();
    if (filtros?.activo !== undefined) {
      params.append('activo', filtros.activo.toString());
    }
    if (filtros?.buscar) {
      params.append('buscar', filtros.buscar);
    }
    if (filtros?.ciudad) {
      params.append('ciudad', filtros.ciudad);
    }
    if (filtros?.tipoPersona) {
      params.append('tipoPersona', filtros.tipoPersona);
    }

    const queryString = params.toString();
    const endpoint = `/api/clientes${queryString ? `?${queryString}` : ''}`;
    return await request<any[]>(endpoint);
  },

  /**
   * Obtener un cliente por ID
   */
  async obtenerCliente(id: number): Promise<any> {
    return await request<any>(`/api/clientes/${id}`);
  },

  /**
   * Crear un nuevo cliente
   */
  async crearCliente(cliente: any): Promise<{
    success: boolean;
    idCliente: number;
    idTercero: number;
    codigoCliente: string;
    mensaje: string;
  }> {
    return await request<{
      success: boolean;
      idCliente: number;
      idTercero: number;
      codigoCliente: string;
      mensaje: string;
    }>('/api/clientes', {
      method: 'POST',
      body: JSON.stringify(cliente),
    });
  },

  /**
   * Actualizar un cliente
   */
  async actualizarCliente(id: number, cliente: any): Promise<{
    success: boolean;
    mensaje: string;
  }> {
    return await request<{
      success: boolean;
      mensaje: string;
    }>(`/api/clientes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(cliente),
    });
  },

  /**
   * Eliminar un cliente (soft delete)
   */
  async eliminarCliente(id: number): Promise<{
    success: boolean;
    mensaje: string;
  }> {
    return await request<{
      success: boolean;
      mensaje: string;
    }>(`/api/clientes/${id}`, {
      method: 'DELETE',
    });
  },
};

// =============================================
// Servicios de Asientos Contables
// =============================================
export const asientosService = {
  /**
   * Crear un nuevo asiento contable
   */
  async crearAsiento(asiento: AsientoContable): Promise<{
    success: boolean;
    idComprobante: number;
    mensaje: string;
  }> {
    return await request<{
      success: boolean;
      idComprobante: number;
      mensaje: string;
    }>('/api/asientos', {
      method: 'POST',
      body: JSON.stringify(asiento),
    });
  },

  /**
   * Obtener asientos contables
   * @param fechaDesde - Fecha desde (opcional)
   * @param fechaHasta - Fecha hasta (opcional)
   */
  async obtenerAsientos(
    fechaDesde?: string,
    fechaHasta?: string
  ): Promise<any[]> {
    const params = new URLSearchParams();
    if (fechaDesde) {
      params.append('fechaDesde', fechaDesde);
    }
    if (fechaHasta) {
      params.append('fechaHasta', fechaHasta);
    }

    const queryString = params.toString();
    const endpoint = `/api/asientos${queryString ? `?${queryString}` : ''}`;

    return await request<any[]>(endpoint);
  },

  /**
   * Obtener un asiento contable por ID
   * @param id - ID del asiento contable
   */
  async obtenerAsiento(id: number): Promise<any> {
    return await request<any>(`/api/asientos/${id}`);
  },
};

// =============================================
// Servicio de Health Check
// =============================================
export const healthService = {
  /**
   * Verificar el estado del servidor
   */
  async checkHealth(): Promise<{ status: string; message: string }> {
    return await request<{ status: string; message: string }>('/api/health');
  },

  /**
   * Validar conexión a SQL Server
   */
  async validateDatabase(): Promise<{
    status: string;
    connected: boolean;
    message: string;
    database?: {
      name: string;
      server: string;
      version: string;
    };
    error?: string;
    detalles?: {
      server: string;
      database: string;
    };
  }> {
    return await request<{
      status: string;
      connected: boolean;
      message: string;
      database?: {
        name: string;
        server: string;
        version: string;
      };
      error?: string;
      detalles?: {
        server: string;
        database: string;
      };
    }>('/api/health/db');
  },
};

// =============================================
// Servicios de Productos
// =============================================
export const productosService = {
  /**
   * Obtener todos los productos
   */
  async obtenerProductos(filtros?: {
    activo?: boolean;
    codigo?: string;
    buscar?: string;
  }): Promise<any[]> {
    const params = new URLSearchParams();
    if (filtros?.activo !== undefined) {
      params.append('activo', filtros.activo.toString());
    }
    if (filtros?.codigo) {
      params.append('codigo', filtros.codigo);
    }
    if (filtros?.buscar) {
      params.append('buscar', filtros.buscar);
    }

    const queryString = params.toString();
    const endpoint = `/api/productos${queryString ? `?${queryString}` : ''}`;
    return await request<any[]>(endpoint);
  },

  /**
   * Obtener un producto por ID
   */
  async obtenerProducto(id: number): Promise<any> {
    return await request<any>(`/api/productos/${id}`);
  },

  /**
   * Buscar un producto por código, código de barras o nombre
   * Retorna un producto si hay coincidencia exacta o un solo resultado
   * Retorna un objeto con array de productos si hay múltiples resultados
   */
  async buscarProductoPorCodigo(codigo: string): Promise<any> {
    return await request<any>(`/api/productos/buscar/${encodeURIComponent(codigo)}`);
  },

  /**
   * Crear un nuevo producto
   */
  async crearProducto(producto: any): Promise<{ success: boolean; idProducto: number; mensaje: string }> {
    return await request<{ success: boolean; idProducto: number; mensaje: string }>('/api/productos', {
      method: 'POST',
      body: JSON.stringify(producto),
    });
  },

  /**
   * Actualizar un producto
   */
  async actualizarProducto(id: number, producto: any): Promise<{ success: boolean; mensaje: string }> {
    return await request<{ success: boolean; mensaje: string }>(`/api/productos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(producto),
    });
  },
};

// =============================================
// Servicios de Facturación
// =============================================
export const facturasService = {
  /**
   * Crear una nueva factura
   */
  async crearFactura(factura: any): Promise<{ success: boolean; idFactura: number; mensaje: string }> {
    return await request<{ success: boolean; idFactura: number; mensaje: string }>('/api/facturas', {
      method: 'POST',
      body: JSON.stringify(factura),
    });
  },

  /**
   * Obtener todas las facturas
   */
  async obtenerFacturas(filtros?: {
    fechaDesde?: string;
    fechaHasta?: string;
    estado?: string;
    idCliente?: number;
  }): Promise<any[]> {
    const params = new URLSearchParams();
    if (filtros?.fechaDesde) params.append('fechaDesde', filtros.fechaDesde);
    if (filtros?.fechaHasta) params.append('fechaHasta', filtros.fechaHasta);
    if (filtros?.estado) params.append('estado', filtros.estado);
    if (filtros?.idCliente) params.append('idCliente', filtros.idCliente.toString());

    const queryString = params.toString();
    const endpoint = `/api/facturas${queryString ? `?${queryString}` : ''}`;
    return await request<any[]>(endpoint);
  },

  /**
   * Obtener una factura por ID
   */
  async obtenerFactura(id: number): Promise<any> {
    return await request<any>(`/api/facturas/${id}`);
  },

  /**
   * Cambiar estado de una factura
   */
  async cambiarEstado(id: number, estado: string): Promise<{ success: boolean; mensaje: string }> {
    return await request<{ success: boolean; mensaje: string }>(`/api/facturas/${id}/estado`, {
      method: 'PUT',
      body: JSON.stringify({ estado }),
    });
  },
};

// =============================================
// Servicios de Compras
// =============================================
export const comprasService = {
  /**
   * Escanear PDF de factura de compra
   */
  async scanPDFFacturaCompra(file: File): Promise<{ success: boolean; data: any; mensaje: string }> {
    const formData = new FormData();
    formData.append('pdf', file);

    const response = await fetch(`${API_URL}/api/compras/scan-pdf`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`
      },
      body: formData
    });

    // Verificar Content-Type antes de parsear JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      throw new ApiException(
        `Error del servidor: ${response.status} ${response.statusText}`,
        response.status,
        text.substring(0, 200) // Primeros 200 caracteres del error
      );
    }

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new ApiException(
        error.mensaje || 'Error al escanear la factura',
        response.status,
        error.detalles
      );
    }

    return await response.json();
  },

  async crearCompra(compra: any): Promise<{ success: boolean; idCompra: number; mensaje: string }> {
    return await request<{ success: boolean; idCompra: number; mensaje: string }>('/api/compras', {
      method: 'POST',
      body: JSON.stringify(compra),
    });
  },

  /**
   * Obtener todas las compras
   */
  async obtenerCompras(filtros?: {
    fechaDesde?: string;
    fechaHasta?: string;
    estado?: string;
    idProveedor?: number;
  }): Promise<any[]> {
    const params = new URLSearchParams();
    if (filtros?.fechaDesde) params.append('fechaDesde', filtros.fechaDesde);
    if (filtros?.fechaHasta) params.append('fechaHasta', filtros.fechaHasta);
    if (filtros?.estado) params.append('estado', filtros.estado);
    if (filtros?.idProveedor) params.append('idProveedor', filtros.idProveedor.toString());

    const queryString = params.toString();
    const endpoint = `/api/compras${queryString ? `?${queryString}` : ''}`;
    return await request<any[]>(endpoint);
  },

  /**
   * Obtener una compra por ID
   */
  async obtenerCompra(id: number): Promise<any> {
    return await request<any>(`/api/compras/${id}`);
  },

  /**
   * Cambiar estado de una compra
   */
  async cambiarEstado(id: number, estado: string): Promise<{ success: boolean; mensaje: string }> {
    return await request<{ success: boolean; mensaje: string }>(`/api/compras/${id}/estado`, {
      method: 'PUT',
      body: JSON.stringify({ estado }),
    });
  },
};

// =============================================
// Servicios de Inventario
// =============================================
export const inventarioService = {
  /**
   * Obtener inventario
   */
  async obtenerInventario(filtros?: {
    bajoStock?: boolean;
    buscar?: string;
  }): Promise<any[]> {
    const params = new URLSearchParams();
    if (filtros?.bajoStock) params.append('bajoStock', 'true');
    if (filtros?.buscar) params.append('buscar', filtros.buscar);

    const queryString = params.toString();
    const endpoint = `/api/inventario${queryString ? `?${queryString}` : ''}`;
    return await request<any[]>(endpoint);
  },

  /**
   * Obtener movimientos de inventario de un producto
   */
  async obtenerMovimientos(
    idProducto: number,
    filtros?: {
      fechaDesde?: string;
      fechaHasta?: string;
      tipoMovimiento?: string;
    }
  ): Promise<any[]> {
    const params = new URLSearchParams();
    if (filtros?.fechaDesde) params.append('fechaDesde', filtros.fechaDesde);
    if (filtros?.fechaHasta) params.append('fechaHasta', filtros.fechaHasta);
    if (filtros?.tipoMovimiento) params.append('tipoMovimiento', filtros.tipoMovimiento);

    const queryString = params.toString();
    const endpoint = `/api/inventario/${idProducto}/movimientos${queryString ? `?${queryString}` : ''}`;
    return await request<any[]>(endpoint);
  },

  /**
   * Hacer ajuste manual de inventario
   */
  async ajustarInventario(
    idProducto: number,
    ajuste: { cantidad: number; concepto: string; idUsuario: number }
  ): Promise<{ success: boolean; mensaje: string; cantidadAnterior: number; cantidadNueva: number }> {
    return await request<{
      success: boolean;
      mensaje: string;
      cantidadAnterior: number;
      cantidadNueva: number;
    }>(`/api/inventario/${idProducto}/ajuste`, {
      method: 'POST',
      body: JSON.stringify(ajuste),
    });
  },
};

// Exportar todo como un objeto único para facilitar el uso
// =============================================
// Servicios de Cotizaciones
// =============================================
export const cotizacionesService = {
  async obtenerCotizaciones(filtros?: {
    estado?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    idCliente?: number;
  }): Promise<any[]> {
    const params = new URLSearchParams();
    if (filtros?.estado) params.append('estado', filtros.estado);
    if (filtros?.fechaDesde) params.append('fechaDesde', filtros.fechaDesde);
    if (filtros?.fechaHasta) params.append('fechaHasta', filtros.fechaHasta);
    if (filtros?.idCliente) params.append('idCliente', filtros.idCliente.toString());

    const queryString = params.toString();
    return await request<any[]>(`/api/cotizaciones${queryString ? `?${queryString}` : ''}`);
  },

  async obtenerCotizacion(id: number): Promise<any> {
    return await request<any>(`/api/cotizaciones/${id}`);
  },

  async crearCotizacion(cotizacion: any): Promise<{
    success: boolean;
    idCotizacion: number;
    numeroCotizacion: string;
    mensaje: string;
  }> {
    return await request<{
      success: boolean;
      idCotizacion: number;
      numeroCotizacion: string;
      mensaje: string;
    }>('/api/cotizaciones', {
      method: 'POST',
      body: JSON.stringify(cotizacion),
    });
  },

  async convertirAFactura(idCotizacion: number, datos?: { fecha?: string; estado?: string }): Promise<{
    success: boolean;
    idFactura: number;
    numeroFactura: string;
    idCotizacion: number;
    mensaje: string;
  }> {
    return await request<{
      success: boolean;
      idFactura: number;
      numeroFactura: string;
      idCotizacion: number;
      mensaje: string;
    }>(`/api/cotizaciones/${idCotizacion}/convertir-factura`, {
      method: 'POST',
      body: JSON.stringify(datos || {}),
    });
  },
};

// =============================================
// Servicios de Órdenes de Compra
// =============================================
export const ordenesCompraService = {
  async obtenerOrdenesCompra(filtros?: {
    estado?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    idProveedor?: number;
  }): Promise<any[]> {
    const params = new URLSearchParams();
    if (filtros?.estado) params.append('estado', filtros.estado);
    if (filtros?.fechaDesde) params.append('fechaDesde', filtros.fechaDesde);
    if (filtros?.fechaHasta) params.append('fechaHasta', filtros.fechaHasta);
    if (filtros?.idProveedor) params.append('idProveedor', filtros.idProveedor.toString());

    const queryString = params.toString();
    return await request<any[]>(`/api/ordenes-compra${queryString ? `?${queryString}` : ''}`);
  },

  async obtenerOrdenCompra(id: number): Promise<any> {
    return await request<any>(`/api/ordenes-compra/${id}`);
  },

  async crearOrdenCompra(orden: any): Promise<{
    success: boolean;
    idOrdenCompra: number;
    numeroOrden: string;
    mensaje: string;
  }> {
    return await request<{
      success: boolean;
      idOrdenCompra: number;
      numeroOrden: string;
      mensaje: string;
    }>('/api/ordenes-compra', {
      method: 'POST',
      body: JSON.stringify(orden),
    });
  },

  async convertirACompra(idOrdenCompra: number, datos?: { fecha?: string; estado?: string }): Promise<{
    success: boolean;
    idCompra: number;
    numeroCompra: string;
    idOrdenCompra: number;
    mensaje: string;
  }> {
    return await request<{
      success: boolean;
      idCompra: number;
      numeroCompra: string;
      idOrdenCompra: number;
      mensaje: string;
    }>(`/api/ordenes-compra/${idOrdenCompra}/convertir-compra`, {
      method: 'POST',
      body: JSON.stringify(datos || {}),
    });
  },
};

export const api = {
  auth: authService,
  puc: pucService,
  terceros: tercerosService,
  clientes: clientesService,
  vendedores: {
    async obtenerVendedores(filtros?: { activo?: boolean; buscar?: string }): Promise<any[]> {
      const params = new URLSearchParams();
      if (filtros?.activo !== undefined) {
        params.append('activo', filtros.activo.toString());
      }
      if (filtros?.buscar) {
        params.append('buscar', filtros.buscar);
      }
      const queryString = params.toString();
      const endpoint = `/api/vendedores${queryString ? `?${queryString}` : ''}`;
      return await request<any[]>(endpoint);
    },
    async obtenerVendedor(id: number): Promise<any> {
      return await request<any>(`/api/vendedores/${id}`);
    },
    async crearVendedor(vendedor: any): Promise<any> {
      return await request<any>('/api/vendedores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vendedor),
      });
    },
    async actualizarVendedor(id: number, vendedor: any): Promise<any> {
      return await request<any>(`/api/vendedores/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vendedor),
      });
    },
    async eliminarVendedor(id: number): Promise<any> {
      return await request<any>(`/api/vendedores/${id}`, {
        method: 'DELETE',
      });
    },
  },
  proveedores: {
    async obtenerProveedores(filtros?: { activo?: boolean; buscar?: string; ciudad?: string; tipoPersona?: 'N' | 'J' }): Promise<any[]> {
      const params = new URLSearchParams();
      if (filtros?.activo !== undefined) {
        params.append('activo', filtros.activo.toString());
      }
      if (filtros?.buscar) {
        params.append('buscar', filtros.buscar);
      }
      if (filtros?.ciudad) {
        params.append('ciudad', filtros.ciudad);
      }
      if (filtros?.tipoPersona) {
        params.append('tipoPersona', filtros.tipoPersona);
      }
      const queryString = params.toString();
      const endpoint = `/api/proveedores${queryString ? `?${queryString}` : ''}`;
      return await request<any[]>(endpoint);
    },
    async obtenerProveedor(id: number): Promise<any> {
      return await request<any>(`/api/proveedores/${id}`);
    },
    async crearProveedor(proveedor: any): Promise<any> {
      return await request<any>('/api/proveedores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proveedor),
      });
    },
    async actualizarProveedor(id: number, proveedor: any): Promise<any> {
      return await request<any>(`/api/proveedores/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proveedor),
      });
    },
    async eliminarProveedor(id: number): Promise<any> {
      return await request<any>(`/api/proveedores/${id}`, {
        method: 'DELETE',
      });
    },
  },
  asientos: asientosService,
  productos: productosService,
  facturas: facturasService,
  compras: comprasService,
  cotizaciones: cotizacionesService,
  ordenesCompra: ordenesCompraService,
  inventario: inventarioService,
  health: healthService,
  pos: posService,
};

export default api;

