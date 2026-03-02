import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AsientoForm from '../components/AsientoForm';
import { AsientoContable, CuentaPUC, Tercero } from '../types';
import { api, ApiException } from '../services';
import Toolbar from '../components/Toolbar';

interface AsientoListado {
  idComprobante: number;
  fecha: string;
  descripcion: string;
  totalDebito: number;
  totalCredito: number;
}

const AsientosPage: React.FC = () => {
  const navigate = useNavigate();
  const [cuentasPUC, setCuentasPUC] = useState<CuentaPUC[]>([]);
  const [terceros, setTerceros] = useState<Tercero[]>([]);
  const [asientos, setAsientos] = useState<AsientoListado[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [mostrarFormulario, setMostrarFormulario] = useState<boolean>(false);
  const [asientoSeleccionado, setAsientoSeleccionado] = useState<number | null>(null);
  const [buscar, setBuscar] = useState<string>('');

  useEffect(() => {
    // Verificar autenticación
    if (!api.auth.isAuthenticated()) {
      navigate('/login');
      return;
    }

    cargarDatos();
  }, [navigate]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError('');

      // Cargar cuentas PUC, terceros y asientos en paralelo
      const [pucData, tercerosData, asientosData] = await Promise.all([
        api.puc.obtenerCuentas(),
        api.terceros.obtenerTerceros(),
        api.asientos.obtenerAsientos()
      ]);

      setCuentasPUC(pucData);
      setTerceros(tercerosData);
      setAsientos(asientosData);
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.message);
      } else {
        setError('Error al cargar los datos necesarios');
      }
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (asiento: AsientoContable): Promise<void> => {
    try {
      const result = await api.asientos.crearAsiento(asiento);
      alert(`Asiento contable registrado exitosamente. ID: ${result.idComprobante}`);
      setMostrarFormulario(false);
      await cargarDatos(); // Recargar la lista de asientos
    } catch (err) {
      if (err instanceof ApiException) {
        throw new Error(err.message);
      }
      throw new Error('Error al guardar el asiento');
    }
  };

  const verDetalleAsiento = async (id: number) => {
    try {
      const detalle = await api.asientos.obtenerAsiento(id);
      let mensaje = `Asiento #${detalle.idComprobante}\nFecha: ${detalle.fecha}\nDescripción: ${detalle.descripcion}\n\nMovimientos:\n`;
      detalle.movimientos.forEach((mov: any, index: number) => {
        mensaje += `\n${index + 1}. ${mov.codigoCuenta} - ${mov.nombreCuenta}`;
        if (mov.nombreTercero) {
          mensaje += ` (${mov.nombreTercero})`;
        }
        if (mov.valorDebito > 0) {
          mensaje += `\n   Débito: $${mov.valorDebito.toLocaleString('es-CO', { minimumFractionDigits: 2 })}`;
        }
        if (mov.valorCredito > 0) {
          mensaje += `\n   Crédito: $${mov.valorCredito.toLocaleString('es-CO', { minimumFractionDigits: 2 })}`;
        }
      });
      mensaje += `\n\nTotal Débito: $${detalle.totalDebito.toLocaleString('es-CO', { minimumFractionDigits: 2 })}`;
      mensaje += `\nTotal Crédito: $${detalle.totalCredito.toLocaleString('es-CO', { minimumFractionDigits: 2 })}`;
      alert(mensaje);
    } catch (err) {
      console.error('Error al obtener detalle del asiento:', err);
      alert('Error al obtener el detalle del asiento');
    }
  };

  // Filtrar asientos según búsqueda
  const asientosFiltrados = asientos.filter(asiento => {
    if (!buscar) return true;
    const busqueda = buscar.toLowerCase();
    return (
      asiento.descripcion.toLowerCase().includes(busqueda) ||
      asiento.idComprobante.toString().includes(busqueda) ||
      asiento.fecha.includes(busqueda)
    );
  });

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">Cargando datos...</div>
      </div>
    );
  }

  if (error && !cuentasPUC.length) {
    return (
      <div className="page-container">
        <div className="error">{error}</div>
        <button onClick={cargarDatos} className="btn btn-primary">
          Reintentar
        </button>
      </div>
    );
  }

  if (mostrarFormulario) {
    return (
      <div className="page-container">
        <header className="page-header">
          <button onClick={() => setMostrarFormulario(false)} className="btn btn-secondary">
            ← Volver a la Lista
          </button>
          <h1>Nuevo Asiento Contable</h1>
        </header>

        {error && <div className="alert alert-error">{error}</div>}

        <AsientoForm
          cuentasPUC={cuentasPUC}
          terceros={terceros}
          onSubmit={handleSubmit}
        />
      </div>
    );
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <button onClick={() => navigate('/dashboard')} className="btn btn-secondary">
          ← Volver al Dashboard
        </button>
        <h1>Asientos Contables</h1>
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      <Toolbar
        showSearch={true}
        searchValue={buscar}
        onSearchChange={setBuscar}
        onSearch={cargarDatos}
        searchPlaceholder="Buscar por descripción, ID o fecha..."
        showNew={true}
        onNew={() => setMostrarFormulario(true)}
        newLabel="➕ Nuevo Asiento"
        showPrint={true}
        onPrint={() => window.print()}
      />

      <div className="table-container" style={{ marginTop: '20px' }}>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Fecha</th>
              <th>Descripción</th>
              <th>Total Débito</th>
              <th>Total Crédito</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {asientosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center">
                  {asientos.length === 0 ? 'No hay asientos contables registrados' : 'No se encontraron asientos con los filtros aplicados'}
                </td>
              </tr>
            ) : (
              asientosFiltrados.map((asiento) => (
                <tr key={asiento.idComprobante}>
                  <td>{asiento.idComprobante}</td>
                  <td>{new Date(asiento.fecha).toLocaleDateString('es-CO')}</td>
                  <td>{asiento.descripcion}</td>
                  <td className="text-right">${asiento.totalDebito.toLocaleString('es-CO', { minimumFractionDigits: 2 })}</td>
                  <td className="text-right">${asiento.totalCredito.toLocaleString('es-CO', { minimumFractionDigits: 2 })}</td>
                  <td>
                    <button
                      onClick={() => verDetalleAsiento(asiento.idComprobante)}
                      className="btn btn-small btn-secondary"
                    >
                      👁️ Ver
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AsientosPage;

