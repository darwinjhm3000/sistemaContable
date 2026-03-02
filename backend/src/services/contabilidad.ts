// Servicio para generar asientos contables automáticos
import sql from 'mssql';
import { ConnectionPool } from 'mssql';

export interface MovimientoAsiento {
  codigoCuenta: string;
  idTercero?: number;
  valorDebito: number;
  valorCredito: number;
}

export interface AsientoAutomatico {
  fecha: string;
  descripcion: string;
  movimientos: MovimientoAsiento[];
  idUsuarioCreacion: number;
  referencia?: string;
  tipoReferencia?: string;
}

/**
 * Crea un asiento contable automático
 * @param pool Pool de conexiones a la base de datos
 * @param asiento Datos del asiento a crear
 * @returns ID del comprobante creado
 */
export async function crearAsientoAutomatico(
  pool: ConnectionPool,
  asiento: AsientoAutomatico
): Promise<number> {
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    // Calcular totales
    const totalDebito = asiento.movimientos.reduce(
      (sum, mov) => sum + (mov.valorDebito || 0),
      0
    );
    const totalCredito = asiento.movimientos.reduce(
      (sum, mov) => sum + (mov.valorCredito || 0),
      0
    );

    // Validar partida doble
    if (Math.abs(totalDebito - totalCredito) > 0.01) {
      throw new Error(`Los totales de débito (${totalDebito}) y crédito (${totalCredito}) no cuadran`);
    }

    if (totalDebito === 0 || totalCredito === 0) {
      throw new Error('Los totales deben ser mayores a cero');
    }

    // Validar que todas las cuentas existan y estén activas
    const codigosCuentas = [...new Set(asiento.movimientos.map(m => m.codigoCuenta))]; // Eliminar duplicados

    // Validar cada cuenta individualmente (más compatible con diferentes versiones de SQL Server)
    const cuentasInvalidas: string[] = [];
    for (const codigoCuenta of codigosCuentas) {
      const cuentaResult = await transaction.request()
        .input('codigoCuenta', sql.VarChar(20), codigoCuenta)
        .query(`
          SELECT CodigoCuenta
          FROM CuentasPUC
          WHERE CodigoCuenta = @codigoCuenta
            AND Activa = 1
        `);

      if (cuentaResult.recordset.length === 0) {
        cuentasInvalidas.push(codigoCuenta);
      }
    }

    if (cuentasInvalidas.length > 0) {
      throw new Error(`Las siguientes cuentas no existen o están inactivas: ${cuentasInvalidas.join(', ')}`);
    }

    // Insertar cabecera del comprobante
    const comprobanteResult = await transaction.request()
      .input('fecha', sql.Date, asiento.fecha)
      .input('descripcion', sql.VarChar(500), asiento.descripcion)
      .input('totalDebito', sql.Decimal(18, 2), totalDebito)
      .input('totalCredito', sql.Decimal(18, 2), totalCredito)
      .input('idUsuarioCreacion', sql.Int, asiento.idUsuarioCreacion)
      .query(`
        INSERT INTO Comprobantes (Fecha, Descripcion, TotalDebito, TotalCredito, IdUsuarioCreacion)
        OUTPUT INSERTED.IdComprobante
        VALUES (@fecha, @descripcion, @totalDebito, @totalCredito, @idUsuarioCreacion)
      `);

    const idComprobante = comprobanteResult.recordset[0].IdComprobante;

    // Insertar detalles del comprobante
    for (const movimiento of asiento.movimientos) {
      await transaction.request()
        .input('idComprobante', sql.Int, idComprobante)
        .input('codigoCuenta', sql.VarChar(20), movimiento.codigoCuenta)
        .input('idTercero', sql.Int, movimiento.idTercero || null)
        .input('valorDebito', sql.Decimal(18, 2), movimiento.valorDebito || 0)
        .input('valorCredito', sql.Decimal(18, 2), movimiento.valorCredito || 0)
        .query(`
          INSERT INTO DetalleComprobante
            (IdComprobante, CodigoCuenta, IdTercero, ValorDebito, ValorCredito)
          VALUES
            (@idComprobante, @codigoCuenta, @idTercero, @valorDebito, @valorCredito)
        `);
    }

    await transaction.commit();
    return idComprobante;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

