// Tipos compartidos para el backend
export interface AsientoContable {
  idComprobante?: number;
  fecha: string;
  descripcion: string;
  totalDebito: number;
  totalCredito: number;
  movimientos: MovimientoContable[];
}

export interface MovimientoContable {
  idMovimiento?: number;
  codigoCuenta: string;
  nombreCuenta?: string;
  idTercero?: number;
  nombreTercero?: string;
  valorDebito: number;
  valorCredito: number;
}

