// Interfaces TypeScript para el Sistema Contable

export interface Tercero {
  idTercero: number;
  nit: string;
  nombreRazonSocial: string;
  direccion?: string;
  tipo: 'Cliente' | 'Proveedor' | 'Otro';
}

export interface Cliente {
  idCliente?: number;
  idTercero?: number;
  codigoCliente?: string;
  nit: string;
  nombreRazonSocial: string;
  direccion?: string;
  telefono?: string;
  celular?: string;
  email?: string;
  ciudad?: string;
  departamento?: string;
  tipoPersona?: 'N' | 'J'; // N=Natural, J=Jurídica
  regimenTributario?: string;
  condicionPago?: string;
  limiteCredito?: number;
  saldoActual?: number;
  descuento?: number;
  observaciones?: string;
  activo?: boolean;
  fechaCreacion?: Date;
  fechaModificacion?: Date;
}

export interface CuentaPUC {
  codigoCuenta: string;
  nombreCuenta: string;
  naturaleza: 'D' | 'C'; // Débito o Crédito
  nivel: number; // 1-Clase, 2-Grupo, 3-Cuenta, 4-Subcuenta
  codigoPadre?: string; // Para navegación jerárquica
  activa: boolean;
}

export interface MovimientoContable {
  idMovimiento?: number;
  codigoCuenta: string;
  nombreCuenta?: string; // Para mostrar en el formulario
  idTercero?: number;
  nombreTercero?: string; // Para mostrar en el formulario
  valorDebito: number;
  valorCredito: number;
}

export interface AsientoContable {
  idComprobante?: number;
  fecha: string; // ISO date string
  descripcion: string;
  totalDebito: number;
  totalCredito: number;
  movimientos: MovimientoContable[];
}

export interface Comprobante {
  idComprobante: number;
  fecha: Date;
  descripcion: string;
  totalDebito: number;
  totalCredito: number;
}

export interface DetalleComprobante {
  idDetalle: number;
  idComprobante: number;
  codigoCuenta: string;
  idTercero?: number;
  valorDebito: number;
  valorCredito: number;
}

export interface Usuario {
  idUsuario: number;
  usuario: string;
  nombre: string;
  email?: string;
}

export interface LoginRequest {
  usuario: string;
  contraseña: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  usuario?: {
    idUsuario: number;
    usuario: string;
    nombre: string;
    email: string;
    idEmpresa?: number | null;
  };
  empresa?: {
    idEmpresa: number;
    nit: string;
    nombreRazonSocial: string;
    direccion?: string;
    telefono?: string;
    email?: string;
    ciudad?: string;
    departamento?: string;
    regimenTributario?: string;
    representanteLegal?: string;
  } | null;
  mensaje?: string;
}

// ============================================
// Productos e Inventario
// ============================================
export interface Producto {
  idProducto?: number;
  codigo: string;
  codigoBarras?: string | null;
  nombre: string;
  descripcion?: string;
  unidadMedida: string;
  precioVenta: number;
  precioCompra: number;
  iva: number;
  activo: boolean;
  cantidadStock?: number; // Stock disponible (opcional, viene del backend)
  cantidadMinima?: number; // Cantidad mínima de stock (opcional)
}

export interface Inventario {
  idInventario?: number;
  idProducto: number;
  producto?: Producto;
  cantidad: number;
  cantidadMinima: number;
  cantidadMaxima?: number;
  ubicacion?: string;
  fechaUltimaActualizacion?: Date;
  bajoStock?: boolean;
  valorInventario?: number;
}

export interface MovimientoInventario {
  idMovimiento?: number;
  idProducto: number;
  producto?: Producto;
  tipoMovimiento: 'Entrada' | 'Salida' | 'Ajuste' | 'Devolucion';
  cantidad: number;
  cantidadAnterior: number;
  cantidadNueva: number;
  concepto: string;
  referencia?: string;
  tipoReferencia?: string;
  fechaMovimiento?: Date;
  idUsuario: number;
}

// ============================================
// Empresa
// ============================================
export interface Empresa {
  idEmpresa: number;
  nit: string;
  nombreRazonSocial: string;
  direccion?: string;
  telefono?: string;
  celular?: string;
  email?: string;
  ciudad?: string;
  departamento?: string;
  regimenTributario?: string;
  representanteLegal?: string;
  logo?: string;
  activa: boolean;
}// ============================================
// Facturación
// ============================================
export interface DetalleFactura {
  idDetalleFactura?: number;
  idFactura?: number;
  idProducto: number;
  producto?: Producto;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  iva: number;
  subtotal: number;
  total: number;
}

export interface Factura {
  idFactura?: number;
  numeroFactura: string;
  fecha: string;
  idCliente: number;
  idVendedor?: number;
  codigoVendedor?: string;
  nombreVendedor?: string;
  cliente?: Tercero;
  empresa?: Empresa;
  subtotal: number;
  iva: number;
  total: number;
  estado: 'Borrador' | 'Emitida' | 'Anulada';
  observaciones?: string;
  idUsuarioCreacion: number;
  detalles: DetalleFactura[];
  cufe?: string;
  qrCode?: string;
  ambienteDIAN?: string;
  tipoDocumentoElectronico?: string;
  estadoValidacionDIAN?: string;
}

export interface Cotizacion {
  idCotizacion?: number;
  numeroCotizacion: string;
  fecha: string;
  fechaVencimiento?: string;
  idCliente: number;
  idVendedor?: number;
  codigoVendedor?: string;
  nombreVendedor?: string;
  cliente?: Tercero;
  empresa?: Empresa;
  subtotal: number;
  iva: number;
  total: number;
  estado: 'Borrador' | 'Enviada' | 'Aceptada' | 'Rechazada' | 'Convertida';
  observaciones?: string;
  idFacturaGenerada?: number;
  detalles: DetalleCotizacion[];
}

export interface DetalleCotizacion {
  idDetalleCotizacion?: number;
  idCotizacion?: number;
  idProducto: number;
  producto?: Producto;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  iva: number;
  subtotal: number;
  total: number;
}

export interface OrdenCompra {
  idOrdenCompra?: number;
  numeroOrden: string;
  fecha: string;
  fechaEntregaEsperada?: string;
  idProveedor: number;
  proveedor?: Tercero;
  empresa?: Empresa;
  subtotal: number;
  iva: number;
  total: number;
  estado: 'Borrador' | 'Enviada' | 'Aceptada' | 'Rechazada' | 'Convertida';
  observaciones?: string;
  idCompraGenerada?: number;
  detalles: DetalleOrdenCompra[];
}

export interface DetalleOrdenCompra {
  idDetalleOrdenCompra?: number;
  idOrdenCompra?: number;
  idProducto: number;
  producto?: Producto;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  iva: number;
  subtotal: number;
  total: number;
}

export interface Vendedor {
  idVendedor: number;
  codigoVendedor: string;
  idTercero: number;
  nit: string;
  nombreRazonSocial: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  comision: number;
  activo: boolean;
  fechaCreacion?: string;
  fechaModificacion?: string;
}

export interface Proveedor {
  idProveedor: number;
  idTercero: number;
  codigoProveedor?: string;
  nit: string;
  nombreRazonSocial: string;
  direccion?: string;
  telefono?: string;
  celular?: string;
  email?: string;
  ciudad?: string;
  departamento?: string;
  tipoPersona: 'N' | 'J';
  regimenTributario?: string;
  condicionPago?: string;
  plazoEntrega?: number;
  observaciones?: string;
  activo: boolean;
  fechaCreacion?: string;
  fechaModificacion?: string;
}

// ============================================
// Compras
// ============================================
export interface DetalleCompra {
  idDetalleCompra?: number;
  idCompra?: number;
  idProducto: number;
  producto?: Producto;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  iva: number;
  subtotal: number;
  total: number;
}

export interface Compra {
  idCompra?: number;
  numeroFactura?: string;
  fecha: string;
  idProveedor: number;
  proveedor?: Tercero;
  subtotal: number;
  iva: number;
  total: number;
  estado: 'Borrador' | 'Recibida' | 'Anulada';
  observaciones?: string;
  idUsuarioCreacion: number;
  detalles: DetalleCompra[];
}

// ============================================
// Reportes
// ============================================
export interface ReporteFactura {
  fechaDesde: string;
  fechaHasta: string;
  totalVentas: number;
  totalIVA: number;
  totalNeto: number;
  cantidadFacturas: number;
  facturas: Factura[];
}

export interface ReporteCompra {
  fechaDesde: string;
  fechaHasta: string;
  totalCompras: number;
  totalIVA: number;
  totalNeto: number;
  cantidadCompras: number;
  compras: Compra[];
}

export interface ReporteInventario {
  productos: Inventario[];
  productosBajoStock: Inventario[];
  valorTotalInventario: number;
}