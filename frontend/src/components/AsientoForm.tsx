import React, { useState, useEffect } from 'react';
import { AsientoContable, MovimientoContable, CuentaPUC, Tercero } from '../types';
import Toolbar from './Toolbar';

interface AsientoFormProps {
  cuentasPUC: CuentaPUC[];
  terceros: Tercero[];
  onSubmit: (asiento: AsientoContable) => Promise<void>;
}

const AsientoForm: React.FC<AsientoFormProps> = ({ cuentasPUC, terceros, onSubmit }) => {
  const [fecha, setFecha] = useState<string>(new Date().toISOString().split('T')[0]);
  const [descripcion, setDescripcion] = useState<string>('');
  const [movimientos, setMovimientos] = useState<MovimientoContable[]>([
    { codigoCuenta: '', valorDebito: 0, valorCredito: 0 },
    { codigoCuenta: '', valorDebito: 0, valorCredito: 0 }
  ]);
  const [errores, setErrores] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Calcular totales
  const totalDebito = movimientos.reduce((sum, mov) => sum + (mov.valorDebito || 0), 0);
  const totalCredito = movimientos.reduce((sum, mov) => sum + (mov.valorCredito || 0), 0);
  const diferencia = Math.abs(totalDebito - totalCredito);

  // Validar partida doble
  const esPartidaDobleValida = totalDebito === totalCredito && totalDebito > 0;

  useEffect(() => {
    const nuevosErrores: { [key: string]: string } = {};

    if (!esPartidaDobleValida && totalDebito > 0) {
      nuevosErrores.partidaDoble = `Los totales no cuadran. Diferencia: ${diferencia.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}`;
    }

    movimientos.forEach((mov, index) => {
      if (!mov.codigoCuenta) {
        nuevosErrores[`cuenta_${index}`] = 'Debe seleccionar una cuenta';
      }
      if (mov.valorDebito === 0 && mov.valorCredito === 0) {
        nuevosErrores[`valor_${index}`] = 'Debe ingresar un valor en débito o crédito';
      }
      if (mov.valorDebito > 0 && mov.valorCredito > 0) {
        nuevosErrores[`valor_${index}`] = 'No puede tener débito y crédito simultáneamente';
      }
    });

    setErrores(nuevosErrores);
  }, [movimientos, totalDebito, totalCredito, diferencia, esPartidaDobleValida]);

  const agregarMovimiento = () => {
    setMovimientos([...movimientos, { codigoCuenta: '', valorDebito: 0, valorCredito: 0 }]);
  };

  const eliminarMovimiento = (index: number) => {
    if (movimientos.length > 2) {
      setMovimientos(movimientos.filter((_, i) => i !== index));
    }
  };

  const actualizarMovimiento = (index: number, campo: keyof MovimientoContable, valor: any) => {
    const nuevosMovimientos = [...movimientos];
    nuevosMovimientos[index] = { ...nuevosMovimientos[index], [campo]: valor };

    // Si cambia la cuenta, actualizar el nombre para mostrar
    if (campo === 'codigoCuenta') {
      const cuenta = cuentasPUC.find(c => c.codigoCuenta === valor);
      if (cuenta) {
        nuevosMovimientos[index].nombreCuenta = cuenta.nombreCuenta;
      }
    }

    // Si cambia el tercero, actualizar el nombre para mostrar
    if (campo === 'idTercero') {
      const tercero = terceros.find(t => t.idTercero === valor);
      if (tercero) {
        nuevosMovimientos[index].nombreTercero = tercero.nombreRazonSocial;
      }
    }

    // Si se ingresa débito, limpiar crédito y viceversa
    if (campo === 'valorDebito' && valor > 0) {
      nuevosMovimientos[index].valorCredito = 0;
    }
    if (campo === 'valorCredito' && valor > 0) {
      nuevosMovimientos[index].valorDebito = 0;
    }

    setMovimientos(nuevosMovimientos);
  };

  const formatearMoneda = (valor: number): string => {
    return valor.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!esPartidaDobleValida || Object.keys(errores).length > 0) {
      return;
    }

    if (!descripcion.trim()) {
      setErrores({ ...errores, descripcion: 'La descripción es obligatoria' });
      return;
    }

    setIsSubmitting(true);

    const asiento: AsientoContable = {
      fecha,
      descripcion: descripcion.trim(),
      totalDebito,
      totalCredito,
      movimientos: movimientos.filter(mov => mov.codigoCuenta && (mov.valorDebito > 0 || mov.valorCredito > 0))
    };

    try {
      await onSubmit(asiento);
      // Limpiar formulario después de éxito
      setDescripcion('');
      setMovimientos([
        { codigoCuenta: '', valorDebito: 0, valorCredito: 0 },
        { codigoCuenta: '', valorDebito: 0, valorCredito: 0 }
      ]);
      setErrores({});
    } catch (error) {
      console.error('Error al guardar asiento:', error);
      setErrores({ ...errores, general: 'Error al guardar el asiento. Por favor, intente nuevamente.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="asiento-form-container">
      <h2>Nuevo Asiento Contable</h2>

      <form onSubmit={handleSubmit} className="asiento-form">
        <div className="form-group">
          <label htmlFor="fecha">Fecha:</label>
          <input
            type="date"
            id="fecha"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            required
            className="form-control"
          />
        </div>

        <div className="form-group">
          <label htmlFor="descripcion">Descripción:</label>
          <textarea
            id="descripcion"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            required
            rows={3}
            className="form-control"
            placeholder="Descripción del asiento contable..."
          />
          {errores.descripcion && <span className="error-message">{errores.descripcion}</span>}
        </div>

        <div className="movimientos-table-container">
          <h3>Movimientos Contables</h3>
          <table className="movimientos-table">
            <thead>
              <tr>
                <th>Cuenta PUC</th>
                <th>Tercero</th>
                <th>Débito</th>
                <th>Crédito</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {movimientos.map((movimiento, index) => (
                <tr key={index}>
                  <td>
                    <select
                      value={movimiento.codigoCuenta}
                      onChange={(e) => actualizarMovimiento(index, 'codigoCuenta', e.target.value)}
                      required
                      className={`form-control ${errores[`cuenta_${index}`] ? 'error' : ''}`}
                    >
                      <option value="">Seleccione una cuenta</option>
                      {cuentasPUC
                        .filter(c => c.activa && c.nivel >= 3) // Solo cuentas de nivel 3 o superior
                        .map(cuenta => (
                          <option key={cuenta.codigoCuenta} value={cuenta.codigoCuenta}>
                            {cuenta.codigoCuenta} - {cuenta.nombreCuenta}
                          </option>
                        ))}
                    </select>
                    {errores[`cuenta_${index}`] && (
                      <span className="error-message">{errores[`cuenta_${index}`]}</span>
                    )}
                  </td>
                  <td>
                    <select
                      value={movimiento.idTercero || ''}
                      onChange={(e) => actualizarMovimiento(index, 'idTercero', e.target.value ? parseInt(e.target.value) : undefined)}
                      className="form-control"
                    >
                      <option value="">Sin tercero</option>
                      {terceros.map(tercero => (
                        <option key={tercero.idTercero} value={tercero.idTercero}>
                          {tercero.nit} - {tercero.nombreRazonSocial}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={movimiento.valorDebito || 0}
                      onChange={(e) => actualizarMovimiento(index, 'valorDebito', parseFloat(e.target.value) || 0)}
                      className={`form-control text-right ${errores[`valor_${index}`] ? 'error' : ''}`}
                      placeholder="0.00"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={movimiento.valorCredito || 0}
                      onChange={(e) => actualizarMovimiento(index, 'valorCredito', parseFloat(e.target.value) || 0)}
                      className={`form-control text-right ${errores[`valor_${index}`] ? 'error' : ''}`}
                      placeholder="0.00"
                    />
                    {errores[`valor_${index}`] && (
                      <span className="error-message">{errores[`valor_${index}`]}</span>
                    )}
                  </td>
                  <td>
                    {movimientos.length > 2 && (
                      <button
                        type="button"
                        onClick={() => eliminarMovimiento(index)}
                        className="btn btn-danger btn-sm"
                      >
                        Eliminar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="totales-row">
                <td colSpan={2}><strong>Totales:</strong></td>
                <td className={`text-right ${!esPartidaDobleValida ? 'error' : 'success'}`}>
                  <strong>{formatearMoneda(totalDebito)}</strong>
                </td>
                <td className={`text-right ${!esPartidaDobleValida ? 'error' : 'success'}`}>
                  <strong>{formatearMoneda(totalCredito)}</strong>
                </td>
                <td>
                  {esPartidaDobleValida ? (
                    <span className="success-badge">✓ Cuadra</span>
                  ) : diferencia > 0 ? (
                    <span className="error-badge">Diferencia: {formatearMoneda(diferencia)}</span>
                  ) : null}
                </td>
              </tr>
            </tfoot>
          </table>

          {errores.partidaDoble && (
            <div className="alert alert-danger">{errores.partidaDoble}</div>
          )}

          {errores.general && (
            <div className="alert alert-danger">{errores.general}</div>
          )}

          <button
            type="button"
            onClick={agregarMovimiento}
            className="btn btn-secondary"
          >
            + Agregar Movimiento
          </button>
        </div>

      </form>

      <Toolbar
        showNew={true}
        onNew={() => {
          setFecha(new Date().toISOString().split('T')[0]);
          setDescripcion('');
          setMovimientos([
            { codigoCuenta: '', valorDebito: 0, valorCredito: 0 },
            { codigoCuenta: '', valorDebito: 0, valorCredito: 0 }
          ]);
          setErrores({});
        }}
        newLabel="➕ Nuevo Asiento"
        showSave={true}
        onSave={() => {
          const form = document.querySelector('form');
          if (form) {
            const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
            form.dispatchEvent(submitEvent);
          }
        }}
        saveLabel="💾 Guardar Asiento"
        saveDisabled={!esPartidaDobleValida || isSubmitting || Object.keys(errores).length > 0}
        saving={isSubmitting}
        showPrint={true}
        onPrint={() => window.print()}
      />

      <style>{`
        .asiento-form-container {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .asiento-form {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: 600;
          color: #333;
        }

        .form-control {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }

        .form-control.error {
          border-color: #dc3545;
        }

        .form-control:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 0 2px rgba(0,123,255,0.25);
        }

        .movimientos-table-container {
          margin: 30px 0;
        }

        .movimientos-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15px;
        }

        .movimientos-table th {
          background-color: #f8f9fa;
          padding: 12px;
          text-align: left;
          border-bottom: 2px solid #dee2e6;
          font-weight: 600;
        }

        .movimientos-table td {
          padding: 10px;
          border-bottom: 1px solid #dee2e6;
        }

        .movimientos-table tbody tr:hover {
          background-color: #f8f9fa;
        }

        .movimientos-table .text-right {
          text-align: right;
        }

        .totales-row {
          background-color: #e9ecef;
          font-weight: 600;
        }

        .totales-row .success {
          color: #28a745;
        }

        .totales-row .error {
          color: #dc3545;
        }

        .success-badge {
          color: #28a745;
          font-weight: 600;
        }

        .error-badge {
          color: #dc3545;
          font-weight: 600;
        }

        .error-message {
          display: block;
          color: #dc3545;
          font-size: 12px;
          margin-top: 4px;
        }

        .alert {
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 15px;
        }

        .alert-danger {
          background-color: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }

        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          transition: background-color 0.2s;
        }

        .btn-primary {
          background-color: #007bff;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background-color: #0056b3;
        }

        .btn-primary:disabled {
          background-color: #6c757d;
          cursor: not-allowed;
        }

        .btn-secondary {
          background-color: #6c757d;
          color: white;
        }

        .btn-secondary:hover {
          background-color: #5a6268;
        }

        .btn-danger {
          background-color: #dc3545;
          color: white;
        }

        .btn-danger:hover {
          background-color: #c82333;
        }

        .btn-sm {
          padding: 4px 8px;
          font-size: 12px;
        }

        .form-actions {
          margin-top: 20px;
          text-align: right;
        }
      `}</style>
    </div>
  );
};

export default AsientoForm;

